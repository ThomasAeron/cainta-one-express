import { Router } from 'express';

import { query } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

export const inventoryRouter = Router();

// ------------------------------------------------------------------
// GET /api/inventory/low-stock
// Reads the v_low_stock_products VIEW.
// Auth: staff / admin only (this is operational data).
// ------------------------------------------------------------------
inventoryRouter.get(
  '/low-stock',
  requireAuth,
  requireRole('staff', 'admin'),
  async (req, res, next) => {
    try {
      const { rows } = await query(
        `select *
         from public.v_low_stock_products
         order by shortfall desc`
      );
      res.json({ count: rows.length, items: rows });
    } catch (err) {
      next(err);
    }
  }
);

// ------------------------------------------------------------------
// GET /api/inventory/alerts
// Calls sp_low_stock_report() and formats each row into a
// natural-language sentence. This is the AI-assisted alerting feature
// described in the project brief: "automated alerts for low inventory
// based on predictive consumption rates".
// ------------------------------------------------------------------
inventoryRouter.get(
  '/alerts',
  requireAuth,
  requireRole('staff', 'admin'),
  async (req, res, next) => {
    try {
      const { rows } = await query(
        `select * from public.sp_low_stock_report()`
      );

      // Simple NLG: turn each row into a recommendation sentence.
      // "predictive consumption" is approximated here by treating
      // reorder_point as the desired buffer and shortfall as units to order.
      const alerts = rows.map((r) => ({
        warehouse_code: r.warehouse_code,
        sku: r.sku,
        product_name: r.product_name,
        quantity: r.quantity,
        reorder_point: r.reorder_point,
        shortfall: r.shortfall,
        severity:
          r.shortfall >= r.reorder_point ? 'critical'
          : r.shortfall >= r.reorder_point / 2 ? 'high'
          : 'moderate',
        recommended_order_quantity: Math.max(r.shortfall, 1),
        message:
          `${r.product_name} (${r.sku}) is low at ${r.warehouse_code}: ` +
          `${r.quantity} on hand against a reorder point of ${r.reorder_point}. ` +
          `Recommend ordering ${Math.max(r.shortfall, 1)} more unit(s).`,
      }));

      res.json({
        generated_at: new Date().toISOString(),
        total: alerts.length,
        alerts,
      });
    } catch (err) {
      next(err);
    }
  }
);