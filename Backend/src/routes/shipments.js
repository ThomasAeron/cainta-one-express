import { Router } from 'express';
import { z } from 'zod';

import { pool, query } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { advanceSimulatedDeliveries, assignSimulatedDelivery } from '../simulated-deliveries.js';

export const shipmentsRouter = Router();

// ------------------------------------------------------------------
// GET /api/shipments
// Admin-only: list all shipments for the admin dashboard.
// ------------------------------------------------------------------
shipmentsRouter.get(
  '/',
  requireAuth,
  requireRole('admin', 'staff'),
  async (req, res, next) => {
    try {
      const { rows } = await query(
        `select
           s.id,
           s.tracking_number,
           s.status,
           s.vehicle_type,
           s.scheduled_at,
           s.dispatched_at,
           s.delivered_at,
           s.created_at,
           s.payment_method,
           s.amount_paid,
           a.line1 as destination_line,
           a.area  as destination_area,
           u.full_name as driver_name
         from public.shipments s
         join public.addresses a on a.id = s.destination_addr
         left join public.users u on u.id = s.driver_id
         order by s.created_at desc`
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  }
);

// ------------------------------------------------------------------
// POST /api/shipments  — create a shipment via the stored procedure
// ------------------------------------------------------------------
const createSchema = z.object({
  payment_method: z.enum(['cod', 'gcash', 'card']).optional().default('cod'),
  amount_paid: z.number().min(0).optional().default(0),
  origin_warehouse: z.string().uuid(),
  destination_addr: z.string().uuid(),
  driver_id: z.string().uuid().nullable().optional(),
  vehicle_plate: z.string().max(20).nullable().optional(),
  vehicle_type: z.enum(['motorcycle', 'van', 'truck']).nullable().optional(),
  vehicle_capacity_kg: z.number().int().positive().nullable().optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
  delivery_kind: z.enum(['food', 'bazaar', 'request']).optional().default('request'),
  restaurant: z.object({
    name: z.string().trim().min(1).max(120),
    lat: z.number().min(14.54).max(14.64),
    lon: z.number().min(121.09).max(121.15)
  }).optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
}).superRefine((body, context) => {
  if (body.delivery_kind === 'food' && !body.restaurant) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['restaurant'],
      message: 'A mapped restaurant location is required for Food Express delivery.'
    });
  }
});

shipmentsRouter.post('/', requireAuth, async (req, res, next) => {
  let client;
  let transactionStarted = false;
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const b = parsed.data;
    client = await pool.connect();
    await client.query('begin');
    transactionStarted = true;

    // Generate a unique tracking number: COE-YYYY-XXXXXX
    await client.query("select pg_advisory_xact_lock(hashtext('cainta-shipment-tracking'))");
    const year = new Date().getFullYear();
    const seqRow = await client.query(
      `select count(*) + 1 as n from shipments where tracking_number like $1`,
      [`COE-${year}-%`]
    );
    const tracking = `COE-${year}-${String(seqRow.rows[0].n).padStart(6, '0')}`;

    const result = await client.query(
      `select public.sp_create_shipment(
         $1::varchar, $2::uuid, $3::uuid, $4::uuid,
         $5::varchar, $6::varchar, $7::integer,
         $8::timestamptz, $9::uuid, $10::jsonb
       ) as shipment_id`,
      [
        tracking,
        b.origin_warehouse,
        b.destination_addr,
        b.driver_id ?? null,
        b.vehicle_plate ?? null,
        b.vehicle_type ?? null,
        b.vehicle_capacity_kg ?? null,
        b.scheduled_at ?? null,
        req.user.id,
        JSON.stringify(b.items),
      ]
    );

    const shipmentId = result.rows[0].shipment_id;

    // Save the payment method and amount to the shipment.
    // (The stored procedure doesn't know about these columns yet.)
    await client.query(
      `update public.shipments
       set payment_method = $1, amount_paid = $2
       where id = $3`,
      [b.payment_method, b.amount_paid, shipmentId]
    );

    let deliveryPlan = null;
    if (b.delivery_kind === 'food') {
      const { rows } = await client.query(
        `select created_at,
                (select lat from public.addresses where id = destination_addr) as destination_lat,
                (select lon from public.addresses where id = destination_addr) as destination_lon
         from public.shipments
         where id = $1`,
        [shipmentId]
      );
      if (!rows.length || rows[0].destination_lat == null || rows[0].destination_lon == null) {
        throw new Error('The saved delivery address has no coordinates; the food order cannot be assigned.');
      }
      deliveryPlan = await assignSimulatedDelivery(client, {
        shipmentId,
        trackingNumber: tracking,
        customerId: req.user.id,
        restaurant: b.restaurant,
        destination: {
          lat: Number(rows[0].destination_lat),
          lon: Number(rows[0].destination_lon)
        },
        createdAt: new Date(rows[0].created_at),
        itemCount: b.items.reduce((total, item) => total + item.quantity, 0)
      });
    } else {
      await client.query(
        `insert into public.notifications (user_id, kind, title, body, related_id)
         values ($1, 'order_update', $2, $3, $4)`,
        [
          req.user.id,
          'Order confirmed',
          `Your order ${tracking} has been created and will be dispatched shortly.`,
          shipmentId,
        ]
      );
    }

    await client.query('commit');
    transactionStarted = false;
    res.status(201).json({ id: shipmentId, tracking_number: tracking, delivery_plan: deliveryPlan });
  } catch (err) {
    if (transactionStarted && client) await client.query('rollback');
    next(err);
  } finally {
    client?.release();
  }
});

// ------------------------------------------------------------------
// GET /api/shipments/mine  — shipments created by the current user
// ------------------------------------------------------------------
shipmentsRouter.get('/mine', requireAuth, async (req, res, next) => {
  try {
    await advanceSimulatedDeliveries(pool);
    const { rows } = await query(
      `select
         s.id,
         s.tracking_number,
         s.status,
         s.vehicle_type,
         s.scheduled_at,
         s.dispatched_at,
         s.delivered_at,
         s.created_at,
         a.line1                as destination_line,
         a.area                 as destination_area,
         (select count(*) from public.shipment_items si where si.shipment_id = s.id) as line_count,
         (select max(recorded_at) from public.shipment_events se where se.shipment_id = s.id) as last_event_at,
         p.driver_code as simulated_driver_code,
         d.display_name as simulated_driver_name,
         d.vehicle_model as simulated_vehicle_model,
         p.restaurant_name,
         p.food_prep_minutes,
         p.driver_depart_at,
         p.driver_arrival_at,
         p.food_ready_at,
         p.pickup_eta,
         p.delivery_eta,
         p.status as simulation_status
       from public.shipments s
       join public.addresses a on a.id = s.destination_addr
       left join public.simulated_delivery_plans p on p.shipment_id = s.id
       left join public.simulated_delivery_drivers d on d.driver_code = p.driver_code
       where s.created_by = $1
       order by s.created_at desc
       limit 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------
// GET /api/shipments/operations-map
// Admin/staff map data: facilities, drivers, and latest active positions.
// ------------------------------------------------------------------
shipmentsRouter.get(
  '/operations-map',
  requireAuth,
  requireRole('admin', 'staff'),
  async (req, res, next) => {
    try {
      await advanceSimulatedDeliveries(pool);
      const [warehouses, drivers, simulatedDrivers, simulatedFleet] = await Promise.all([
        query(
          `select w.id, w.code, w.name, a.line1 as address, a.area, a.lat, a.lon
           from public.warehouses w
           left join public.addresses a on a.id = w.address_id
           where w.is_active = true
           order by w.code`
        ),
        query(
          `select
             u.id,
             u.full_name as name,
             location.shipment_id,
             location.tracking_number,
             location.status,
             location.event_type,
             location.notes,
             location.lat,
             location.lon,
             location.recorded_at
           from public.users u
           join public.roles r on r.id = u.role_id
           left join lateral (
             select
               s.id as shipment_id,
               s.tracking_number,
               s.status,
               e.event_type,
               e.notes,
               e.lat,
               e.lon,
               e.recorded_at
             from public.shipments s
             join lateral (
               select event_type, notes, lat, lon, recorded_at
               from public.shipment_events
               where shipment_id = s.id and lat is not null and lon is not null
               order by recorded_at desc
               limit 1
             ) e on true
             where s.driver_id = u.id
               and lower(s.status) not in ('delivered', 'failed', 'cancelled')
             order by e.recorded_at desc
             limit 1
           ) location on true
           where r.name = 'driver' and u.is_active = true
           order by u.full_name`
        ),
        query(
          `select
             s.id as shipment_id,
             s.tracking_number,
             s.status,
             e.event_type,
             e.notes,
             e.lat,
             e.lon,
             e.recorded_at
           from public.shipments s
           join lateral (
             select event_type, notes, lat, lon, recorded_at
             from public.shipment_events
             where shipment_id = s.id and lat is not null and lon is not null
             order by recorded_at desc
             limit 1
           ) e on true
           where s.driver_id is null
             and lower(s.status) not in ('delivered', 'failed', 'cancelled')
           order by e.recorded_at desc`
        ),
        query(
          `select
             d.driver_code,
             d.display_name,
             d.vehicle_model,
             d.vehicle_plate,
             d.current_lat,
             d.current_lon,
             d.available_at,
             p.shipment_id,
             s.tracking_number,
             p.restaurant_name,
             p.driver_origin_lat,
             p.driver_origin_lon,
             p.restaurant_lat,
             p.restaurant_lon,
             p.destination_lat,
             p.destination_lon,
             p.driver_depart_at,
             p.driver_arrival_at,
             p.food_ready_at,
             p.pickup_eta,
             p.delivery_eta,
             p.status as simulation_status
           from public.simulated_delivery_drivers d
           left join lateral (
             select plan.*
             from public.simulated_delivery_plans plan
             where plan.driver_code = d.driver_code
               and plan.status in ('queued', 'assigned', 'picked_up')
               and plan.delivery_eta > now()
             order by (plan.driver_depart_at <= now() and plan.delivery_eta > now()) desc,
                      plan.driver_depart_at
             limit 1
           ) p on true
           left join public.shipments s on s.id = p.shipment_id
           where d.is_active = true
           order by d.driver_code`
        )
      ]);

      res.json({
        warehouses: warehouses.rows,
        drivers: drivers.rows,
        simulatedDrivers: simulatedDrivers.rows,
        simulatedFleet: simulatedFleet.rows,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ------------------------------------------------------------------
// GET /api/shipments/:id  — one shipment with its event timeline
// RBAC: admin/staff/driver see any; customer sees only own
// ------------------------------------------------------------------
shipmentsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    await advanceSimulatedDeliveries(pool);
    const { rows } = await query(
      `select
         s.id,
         s.tracking_number,
         s.status,
         s.vehicle_plate,
         s.vehicle_type,
         s.vehicle_capacity_kg,
         s.scheduled_at,
         s.dispatched_at,
         s.delivered_at,
         s.created_at,
         s.created_by,
         s.driver_id,
         w.code   as origin_code,
         w.name   as origin_name,
         a.line1  as destination_line,
         a.area   as destination_area,
         a.lat    as destination_lat,
         a.lon    as destination_lon,
         u.full_name as driver_name,
         p.driver_code as simulated_driver_code,
         d.display_name as simulated_driver_name,
         d.vehicle_model as simulated_vehicle_model,
         p.restaurant_name,
         p.food_prep_minutes,
         p.driver_depart_at,
         p.driver_arrival_at,
         p.food_ready_at,
         p.pickup_eta,
         p.delivery_eta,
         p.status as simulation_status
       from public.shipments s
       join public.warehouses w on w.id = s.origin_warehouse
       join public.addresses  a on a.id = s.destination_addr
       left join public.users u on u.id = s.driver_id
       left join public.simulated_delivery_plans p on p.shipment_id = s.id
       left join public.simulated_delivery_drivers d on d.driver_code = p.driver_code
       where s.id = $1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    const shipment = rows[0];

    const isPrivileged = req.user.roles.some((r) =>
      ['admin', 'staff'].includes(r)
    );
    if (!isPrivileged && shipment.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Not allowed to view this shipment' });
    }

    const events = await query(
      `select id, event_type, notes, lat, lon, recorded_at
       from public.shipment_events
       where shipment_id = $1
       order by recorded_at asc`,
      [req.params.id]
    );

    const items = await query(
      `select si.quantity, p.sku, p.name, p.price
       from public.shipment_items si
       join public.products p on p.id = si.product_id
       where si.shipment_id = $1`,
      [req.params.id]
    );

    res.json({
      shipment,
      events: events.rows,
      items: items.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------
// POST /api/shipments/:id/advance
// Push the shipment to a new status and record an event.
// RBAC: staff / admin or the shipment creator.
// ------------------------------------------------------------------
const advanceSchema = z.object({
  event_type: z.enum([
    'assigned',
    'picked_up',
    'in_transit',
    'delivered',
    'failed',
  ]),
  notes: z.string().max(500).optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
});

const STATUS_AFTER = {
  assigned: 'assigned',
  picked_up: 'in_transit',
  in_transit: 'in_transit',
  delivered: 'delivered',
  failed: 'failed',
};

shipmentsRouter.post(
  '/:id/advance',
  requireAuth,
  async (req, res, next) => {
    try {
      const parsed = advanceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
      }
      const { event_type, notes, lat, lon } = parsed.data;

      const found = await query(
        `select id, status, created_by from public.shipments where id = $1`,
        [req.params.id]
      );
      if (found.rows.length === 0) {
        return res.status(404).json({ error: 'Shipment not found' });
      }

      // RBAC: privileged roles can advance any shipment.
      // The creator (typically the customer who placed the order) can advance their own.
      const isPrivileged = req.user.roles.some((r) =>
        ['staff', 'admin'].includes(r)
      );
      const isCreator = found.rows[0].created_by === req.user.id;
      if (!isPrivileged && !isCreator) {
        return res.status(403).json({
          error: 'Requires one of: staff, admin — or ownership of the shipment',
        });
      }
      if (isCreator && !isPrivileged) {
        const simulated = await query(
          `select 1 from public.simulated_delivery_plans where shipment_id = $1`,
          [req.params.id]
        );
        if (simulated.rowCount) {
          return res.status(409).json({
            error: 'This simulated Food Express delivery advances automatically using its forecast times.'
          });
        }
      }

      const newStatus = STATUS_AFTER[event_type];

      await query(
        `insert into public.shipment_events
           (shipment_id, event_type, notes, lat, lon, recorded_by)
         values ($1, $2, $3, $4, $5, $6)`,
        [
          req.params.id,
          event_type,
          notes ?? null,
          lat ?? null,
          lon ?? null,
          req.user.id,
        ]
      );

      const updates = ['status = $1'];
      const values = [newStatus];
      if (event_type === 'picked_up') {
        updates.push(`dispatched_at = coalesce(dispatched_at, now())`);
      }
      if (event_type === 'delivered') {
        updates.push(`delivered_at = now()`);
      }
      values.push(req.params.id);

      const updated = await query(
        `update public.shipments
         set ${updates.join(', ')}
         where id = $${values.length}
         returning id, tracking_number, status, dispatched_at, delivered_at`,
        values
      );

      const updatedShipment = updated.rows[0];

      // Notify the shipment's owner about the status change.
      // Skip intermediate in_transit position writes — they would spam the user.
      const messagesByEvent = {
        assigned:   `Driver assigned to ${updatedShipment.tracking_number}.`,
        picked_up:  `Order ${updatedShipment.tracking_number} has been picked up.`,
        delivered:  `Order ${updatedShipment.tracking_number} has been delivered.`,
        failed:     `Order ${updatedShipment.tracking_number} could not be delivered.`,
      };

      if (messagesByEvent[event_type]) {
        await query(
          `insert into public.notifications (user_id, kind, title, body, related_id)
           values ($1, 'order_update', $2, $3, $4)`,
          [
            found.rows[0].created_by,
            event_type === 'delivered' ? 'Delivered' : 'Order update',
            messagesByEvent[event_type],
            updatedShipment.id,
          ]
        );
      }

      res.json({ shipment: updatedShipment });
    } catch (err) {
      next(err);
    }
  }
);