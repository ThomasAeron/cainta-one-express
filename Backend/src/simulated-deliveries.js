const ROAD_DISTANCE_FACTOR = 1.35;
const simulatedDeliverySettings = Object.freeze({
  approachSpeedKmh: 18,
  deliverySpeedKmh: 20
});

for (const [name, speed] of Object.entries(simulatedDeliverySettings)) {
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new Error(`Simulated delivery setting "${name}" must be a positive number.`);
  }
}

const toRadians = (degrees) => (degrees * Math.PI) / 180;

function distanceKm(from, to) {
  const latitudeDifference = toRadians(to.lat - from.lat);
  const longitudeDifference = toRadians(to.lon - from.lon);
  const latitudeA = toRadians(from.lat);
  const latitudeB = toRadians(to.lat);
  const haversine = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDifference / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function roadMinutes(distance, speed, buffer) {
  return Math.max(3, Math.ceil((distance * ROAD_DISTANCE_FACTOR * 60) / speed) + buffer);
}

function minutesAfter(timestamp, minutes) {
  return new Date(timestamp.getTime() + minutes * 60_000);
}

function estimatePrepMinutes(shipmentId, itemCount) {
  const stableValue = [...shipmentId].reduce((total, character) => total + character.charCodeAt(0), 0);
  return 15 + Math.min(Math.max(itemCount - 1, 0), 5) + (stableValue % 9);
}

function estimateTravelSchedule({ origin, restaurant, destination, foodReadyAt, departAt, pickupAt }) {
  const approachMinutes = roadMinutes(
    distanceKm(origin, restaurant),
    simulatedDeliverySettings.approachSpeedKmh,
    3
  );
  const estimatedArrivalAt = minutesAfter(departAt, approachMinutes);
  const pickupEta = pickupAt
    ? new Date(pickupAt)
    : new Date(Math.max(estimatedArrivalAt.getTime(), foodReadyAt.getTime()));
  const driverArrivalAt = pickupAt && estimatedArrivalAt > pickupEta
    ? pickupEta
    : estimatedArrivalAt;
  const deliveryMinutes = roadMinutes(
    distanceKm(restaurant, destination),
    simulatedDeliverySettings.deliverySpeedKmh,
    5
  );

  return {
    approachMinutes,
    deliveryMinutes,
    driverArrivalAt,
    pickupEta,
    deliveryEta: minutesAfter(pickupEta, deliveryMinutes)
  };
}

export async function assignSimulatedDelivery(client, {
  shipmentId,
  trackingNumber,
  customerId,
  restaurant,
  destination,
  createdAt,
  itemCount
}) {
  await client.query("select pg_advisory_xact_lock(hashtext('cainta-simulated-driver-fleet'))");

  const drivers = await client.query(
    `select
       d.driver_code,
       d.display_name,
       d.vehicle_model,
       d.vehicle_plate,
       d.current_lat,
       d.current_lon,
       d.available_at,
       coalesce(previous.destination_lat, d.current_lat) as next_lat,
       coalesce(previous.destination_lon, d.current_lon) as next_lon
     from public.simulated_delivery_drivers d
     left join lateral (
       select destination_lat, destination_lon
       from public.simulated_delivery_plans
       where driver_code = d.driver_code
       order by delivery_eta desc
       limit 1
     ) previous on true
     where d.is_active = true
     order by d.driver_code
     for update of d`
  );
  if (!drivers.rows.length) {
    throw new Error('The simulated delivery fleet is not configured. Apply the simulated-delivery-fleet migration.');
  }

  const now = new Date();
  const prepMinutes = estimatePrepMinutes(shipmentId, itemCount);
  const foodReadyAt = minutesAfter(createdAt, prepMinutes);
  const candidates = drivers.rows.map((driver) => {
    const origin = { lat: Number(driver.next_lat), lon: Number(driver.next_lon) };
    const availableAt = new Date(driver.available_at);
    const driverDepartAt = availableAt > now ? availableAt : now;
    const schedule = estimateTravelSchedule({
      origin,
      restaurant,
      destination,
      foodReadyAt,
      departAt: driverDepartAt
    });
    return {
      driver,
      origin,
      driverDepartAt,
      foodReadyAt,
      ...schedule,
      totalWaitMs: schedule.deliveryEta.getTime() - now.getTime()
    };
  });
  candidates.sort((a, b) =>
    a.driverArrivalAt.getTime() - b.driverArrivalAt.getTime()
      || a.deliveryEta.getTime() - b.deliveryEta.getTime()
      || a.driver.driver_code.localeCompare(b.driver.driver_code)
  );
  const selected = candidates[0];
  const queueMinutes = Math.max(0, Math.ceil((selected.driverDepartAt.getTime() - now.getTime()) / 60_000));
  const assignmentStatus = selected.driverDepartAt > now ? 'queued' : 'assigned';

  await client.query(
    `insert into public.simulated_delivery_plans
       (shipment_id, driver_code, restaurant_name, driver_origin_lat, driver_origin_lon,
        restaurant_lat, restaurant_lon,
        destination_lat, destination_lon, food_prep_minutes, driver_depart_at,
        driver_arrival_at, food_ready_at, pickup_eta, delivery_eta, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [
      shipmentId,
      selected.driver.driver_code,
      restaurant.name,
      selected.origin.lat,
      selected.origin.lon,
      restaurant.lat,
      restaurant.lon,
      destination.lat,
      destination.lon,
      prepMinutes,
      selected.driverDepartAt,
      selected.driverArrivalAt,
      selected.foodReadyAt,
      selected.pickupEta,
      selected.deliveryEta,
      assignmentStatus
    ]
  );
  await client.query(
    `update public.simulated_delivery_drivers
     set available_at = $1
     where driver_code = $2`,
    [selected.deliveryEta, selected.driver.driver_code]
  );
  await client.query(
    `update public.shipments
     set status = 'assigned',
         scheduled_at = $1,
         dispatched_at = null,
         eta_at = $2,
         vehicle_type = 'motorcycle',
         vehicle_plate = $3
     where id = $4`,
    [selected.driverDepartAt, selected.deliveryEta, selected.driver.vehicle_plate, shipmentId]
  );
  await client.query(
    `insert into public.shipment_events
       (shipment_id, event_type, notes, lat, lon, recorded_by)
     values ($1, 'assigned', $2, $3, $4, null)`,
    [
      shipmentId,
      `Simulated rider ${selected.driver.display_name} reserved. ${assignmentStatus === 'queued' ? `Queued for an available rider slot at ${selected.driverDepartAt.toISOString()}.` : 'Rider is heading to the restaurant.'}`,
      selected.origin.lat,
      selected.origin.lon
    ]
  );
  await client.query(
    `insert into public.notifications (user_id, kind, title, body, related_id)
     values ($1, 'order_update', $2, $3, $4)`,
    [
      customerId,
      'Food order confirmed',
      `Order ${trackingNumber} is confirmed. Food preparation is estimated at ${prepMinutes} minutes; rider pickup is estimated at ${selected.pickupEta.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`,
      shipmentId
    ]
  );

  return {
    driverCode: selected.driver.driver_code,
    driverName: selected.driver.display_name,
    vehicleModel: selected.driver.vehicle_model,
    vehiclePlate: selected.driver.vehicle_plate,
    driverOrigin: selected.origin,
    restaurantName: restaurant.name,
    foodPrepMinutes: prepMinutes,
    approachMinutes: selected.approachMinutes,
    deliveryMinutes: selected.deliveryMinutes,
    queueMinutes,
    status: assignmentStatus,
    driverDepartAt: selected.driverDepartAt.toISOString(),
    driverArrivalAt: selected.driverArrivalAt.toISOString(),
    foodReadyAt: selected.foodReadyAt.toISOString(),
    pickupEta: selected.pickupEta.toISOString(),
    deliveryEta: selected.deliveryEta.toISOString(),
    estimatedDeliveryMinutes: Math.ceil(selected.totalWaitMs / 60_000)
  };
}

export async function recalculateActiveSimulatedDeliveries(pool) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query("select pg_advisory_xact_lock(hashtext('cainta-simulated-driver-fleet'))");
    const { rows: drivers } = await client.query(
      `select driver_code
       from public.simulated_delivery_drivers
       where is_active = true
       order by driver_code
       for update`
    );
    const { rows: plans } = await client.query(
      `select *
       from public.simulated_delivery_plans
       where status in ('queued', 'assigned', 'picked_up')
       order by driver_code, driver_depart_at, created_at
       for update`
    );
    const plansByDriver = new Map(drivers.map(({ driver_code }) => [driver_code, []]));
    for (const plan of plans) {
      plansByDriver.get(plan.driver_code)?.push(plan);
    }

    for (const driver of drivers) {
      const driverPlans = plansByDriver.get(driver.driver_code);
      let previousDeliveryEta = null;
      let previousDestination = null;

      for (const plan of driverPlans) {
        const origin = previousDestination || {
          lat: Number(plan.driver_origin_lat),
          lon: Number(plan.driver_origin_lon)
        };
        const restaurant = {
          lat: Number(plan.restaurant_lat),
          lon: Number(plan.restaurant_lon)
        };
        const destination = {
          lat: Number(plan.destination_lat),
          lon: Number(plan.destination_lon)
        };
        const originalDepartAt = new Date(plan.driver_depart_at);
        const driverDepartAt = previousDeliveryEta || originalDepartAt;
        const foodReadyAt = new Date(
          new Date(plan.created_at).getTime() + Number(plan.food_prep_minutes) * 60_000
        );
        const schedule = estimateTravelSchedule({
          origin,
          restaurant,
          destination,
          foodReadyAt,
          departAt: driverDepartAt,
          pickupAt: plan.status === 'picked_up' ? plan.pickup_eta : null
        });

        await client.query(
          `update public.simulated_delivery_plans
           set driver_origin_lat = $1,
               driver_origin_lon = $2,
               driver_depart_at = $3,
               driver_arrival_at = $4,
               food_ready_at = $5,
               pickup_eta = $6,
               delivery_eta = $7
           where shipment_id = $8`,
          [
            origin.lat,
            origin.lon,
            driverDepartAt,
            schedule.driverArrivalAt,
            foodReadyAt,
            schedule.pickupEta,
            schedule.deliveryEta,
            plan.shipment_id
          ]
        );
        await client.query(
          `update public.shipments
           set scheduled_at = $1, eta_at = $2
           where id = $3`,
          [driverDepartAt, schedule.deliveryEta, plan.shipment_id]
        );

        previousDeliveryEta = schedule.deliveryEta;
        previousDestination = destination;
      }

      if (previousDeliveryEta) {
        await client.query(
          `update public.simulated_delivery_drivers
           set available_at = $1
           where driver_code = $2`,
          [previousDeliveryEta, driver.driver_code]
        );
      }
    }

    await client.query('commit');
    return plans.length;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function advanceSimulatedDeliveries(pool) {
  const duePlans = await pool.query(
    `select p.shipment_id
     from public.simulated_delivery_plans p
    where (p.status in ('queued', 'assigned') and p.pickup_eta <= now())
       or (p.status = 'picked_up' and p.delivery_eta <= now())
     order by p.delivery_eta
     limit 100`
  );

  for (const { shipment_id: shipmentId } of duePlans.rows) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const { rows } = await client.query(
        `select p.*, s.tracking_number, s.created_by, s.status as shipment_status
         from public.simulated_delivery_plans p
         join public.shipments s on s.id = p.shipment_id
         where p.shipment_id = $1
         for update of p, s`,
        [shipmentId]
      );
      if (!rows.length) {
        await client.query('commit');
        continue;
      }

      const plan = rows[0];
      if (new Date(plan.pickup_eta) <= new Date() &&
          !['in_transit', 'delivered'].includes(plan.shipment_status)) {
        await client.query(
          `update public.shipments
           set status = 'in_transit', dispatched_at = coalesce(dispatched_at, $1)
           where id = $2`,
          [plan.pickup_eta, shipmentId]
        );
        await client.query(
          `update public.simulated_delivery_plans set status = 'picked_up' where shipment_id = $1`,
          [shipmentId]
        );
        await client.query(
          `insert into public.shipment_events
             (shipment_id, event_type, notes, lat, lon, recorded_by, recorded_at)
           values ($1, 'picked_up', $2, $3, $4, null, $5)`,
          [
            shipmentId,
            `Simulated rider picked up the prepared order from ${plan.restaurant_name}.`,
            plan.restaurant_lat,
            plan.restaurant_lon,
            plan.pickup_eta
          ]
        );
        await client.query(
          `insert into public.notifications (user_id, kind, title, body, related_id)
           values ($1, 'order_update', 'Food order picked up', $2, $3)`,
          [plan.created_by, `Order ${plan.tracking_number} has been picked up and is on the way.`, shipmentId]
        );
      }

      if (new Date(plan.delivery_eta) <= new Date() && plan.shipment_status !== 'delivered') {
        await client.query(
          `update public.shipments
           set status = 'delivered',
               dispatched_at = coalesce(dispatched_at, $1),
               delivered_at = $2
           where id = $3`,
          [plan.pickup_eta, plan.delivery_eta, shipmentId]
        );
        await client.query(
          `update public.simulated_delivery_plans set status = 'delivered' where shipment_id = $1`,
          [shipmentId]
        );
        await client.query(
          `insert into public.shipment_events
             (shipment_id, event_type, notes, lat, lon, recorded_by, recorded_at)
           values ($1, 'delivered', 'Simulated delivery completed at the estimated arrival time.', $2, $3, null, $4)`,
          [shipmentId, plan.destination_lat, plan.destination_lon, plan.delivery_eta]
        );
        await client.query(
          `insert into public.notifications (user_id, kind, title, body, related_id)
           values ($1, 'order_update', 'Food order delivered', $2, $3)`,
          [plan.created_by, `Order ${plan.tracking_number} has been delivered.`, shipmentId]
        );
        await client.query(
          `update public.simulated_delivery_drivers
           set current_lat = $1, current_lon = $2
           where driver_code = $3`,
          [plan.destination_lat, plan.destination_lon, plan.driver_code]
        );
      }

      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}
