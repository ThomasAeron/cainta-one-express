import { Router } from 'express';
import { z } from 'zod';

import { query } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

export const itemsRouter = Router();

// --- Tiny in-memory cache for the catalog list (speeds up page loads) ---
// The catalog barely changes, so the last result is reused for 60 seconds.
// It is cleared right away when an item is added or removed.
const CATALOG_CACHE_MS = 60_000;
const catalogCache = new Map(); // limit -> { rows, expires }
const clearCatalogCache = () => catalogCache.clear();
export { clearCatalogCache };

itemsRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 500);

    const cached = catalogCache.get(limit);
    if (cached && cached.expires > Date.now()) {
      res.set('Cache-Control', 'public, max-age=30');
      return res.json(cached.rows);
    }

    const { rows } = await query(
      `select p.id, p.sku, p.name, c.name as category,
              p.unit, p.reorder_point, p.price,
              m.name as merchant,
              details.description, details.stock,
              shop.area as seller_area,
              shop.description as seller_description
       from products p
       join categories c on c.id = p.category_id
       left join merchants m on m.id = p.merchant_id
       left join public.bazaar_product_details details
         on details.product_id = p.id::text
       left join public.bazaar_shop_profiles shop
         on shop.merchant_id = m.id::text
       where p.is_active = true
       order by p.name
       limit $1`,
      [limit]
    );
    catalogCache.set(limit, { rows, expires: Date.now() + CATALOG_CACHE_MS });
    res.set('Cache-Control', 'public, max-age=30');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

const createItemSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(60),
  unit: z.string().max(20).default('pc'),
  reorder_point: z.number().int().min(0).default(10),
  price: z.number().min(0).optional(),
});

itemsRouter.post(
  '/',
  requireAuth,
  requireRole('admin', 'staff'),
  async (req, res, next) => {
    try {
      const parsed = createItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
      }
      const { name, category, unit, reorder_point, price } = parsed.data;

      const cat = await query('select id from categories where name = $1', [category]);
      if (cat.rowCount === 0) {
        return res.status(400).json({ error: `Unknown category: ${category}` });
      }

      const skuRow = await query(
        `select 'USR-' || lpad((count(*) + 1)::text, 5, '0') as sku from products`
      );

      const { rows } = await query(
        `insert into products (sku, name, category_id, unit, reorder_point, price)
         values ($1, $2, $3, $4, $5, $6)
         returning id, sku, name, unit, reorder_point, price`,
        [skuRow.rows[0].sku, name, cat.rows[0].id, unit, reorder_point, price ?? null]
      );

      clearCatalogCache();
      res.status(201).json({ ...rows[0], category });
    } catch (err) {
      next(err);
    }
  }
);

// ------------------------------------------------------------------
// DELETE /api/items/:id
// Soft-delete: set is_active = false instead of removing the row.
// Rationale: the product may be referenced by shipment_items,
// purchase_order_items, or inventory. Hard-delete would violate
// referential integrity or leave dangling references.
// RBAC: admin only.
// ------------------------------------------------------------------
itemsRouter.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const existing = await query(
        `select id, sku, name, is_active from public.products where id = $1`,
        [req.params.id]
      );
      if (existing.rowCount === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      if (!existing.rows[0].is_active) {
        return res.json({
          id: existing.rows[0].id,
          sku: existing.rows[0].sku,
          is_active: false,
          note: 'Product was already inactive',
        });
      }

      const updated = await query(
        `update public.products
         set is_active = false
         where id = $1
         returning id, sku, name, is_active`,
        [req.params.id]
      );

      clearCatalogCache();
      res.json(updated.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);