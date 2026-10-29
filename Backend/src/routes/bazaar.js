import { Router } from 'express';
import { z } from 'zod';

import { pool } from '../db.js';
import { requireAuth } from '../auth.js';
import { clearCatalogCache } from './items.js';

export const bazaarRouter = Router();

const CATEGORY_MAP = {
  Clothing: 2,
  Shoes: 2,
  Bags: 2,
  Accessories: 2,
  Home: 3,
  Electronics: 4,
  Other: 4,
};

const caintaAreas = [
  'San Andres',
  'San Isidro',
  'San Juan',
  'San Roque',
  'Santa Rosa',
  'Santo Domingo',
  'Santo Niño',
];
const imageSchema = z.string()
  .max(500_000)
  .regex(/^data:image\/(?:png|jpeg|webp);base64,/);
const shopSchema = z.object({
  name: z.string().trim().min(1).max(80),
  area: z.enum(caintaAreas),
  description: z.string().trim().min(1).max(500),
  photo: imageSchema.nullable().optional(),
});
const listingSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.enum(Object.keys(CATEGORY_MAP)),
  price: z.number().positive().max(10_000_000),
  stock: z.number().int().min(1).max(99_999),
  description: z.string().trim().min(1).max(500),
  photos: z.array(imageSchema).max(3).default([]),
});

const getShopForUser = async (client, userId, lock = false) => {
  const { rows } = await client.query(
    `select shop.user_id, shop.merchant_id, shop.area, shop.description, shop.photo,
            merchant.name
     from public.bazaar_shop_profiles shop
     join public.merchants merchant on merchant.id::text = shop.merchant_id
     where shop.user_id = $1${lock ? ' for update of shop' : ''}`,
    [userId]
  );
  return rows[0] || null;
};

bazaarRouter.get('/bazaar-shop', requireAuth, async (req, res, next) => {
  try {
    const userId = String(req.user.id);
    const client = await pool.connect();
    try {
      const shop = await getShopForUser(client, userId);
      if (!shop) return res.json({ shop: null, products: [] });

      const { rows: products } = await client.query(
        `select p.id, p.sku, p.name, category.name as category, p.price,
                details.stock, details.description
         from public.products p
         join public.categories category on category.id = p.category_id
         join public.bazaar_product_details details on details.product_id = p.id::text
         where p.merchant_id::text = $1 and p.is_active = true
         order by details.created_at desc`,
        [shop.merchant_id]
      );
      return res.json({
        shop: {
          name: shop.name,
          area: shop.area,
          description: shop.description,
          photo: shop.photo,
        },
        products,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

bazaarRouter.get('/bazaar-listing/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `select p.id, p.name, category.name as category, p.price,
              merchant.name as seller,
              details.stock, details.description, details.photos,
              shop.area as seller_area,
              shop.description as seller_description,
              shop.photo as seller_photo
       from public.products p
       join public.categories category on category.id = p.category_id
       left join public.merchants merchant on merchant.id = p.merchant_id
       left join public.bazaar_product_details details
         on details.product_id = p.id::text
       left join public.bazaar_shop_profiles shop
         on shop.merchant_id = merchant.id::text
       where p.id::text = $1 and p.is_active = true`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Product not found.' });
    res.json({
      ...rows[0],
      photos: rows[0].photos || [],
    });
  } catch (err) {
    next(err);
  }
});

bazaarRouter.post('/bazaar-shop', requireAuth, async (req, res, next) => {
  const parsed = shopSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  let client;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query('begin');
    transactionStarted = true;
    const userId = String(req.user.id);
    const currentShop = await getShopForUser(client, userId, true);
    let merchantId;

    if (currentShop) {
      merchantId = currentShop.merchant_id;
      await client.query(
        `update public.merchants
         set name = $1
         where id::text = $2`,
        [parsed.data.name, merchantId]
      );
      await client.query(
        `update public.bazaar_shop_profiles
         set area = $1, description = $2, photo = $3, updated_at = now()
         where user_id = $4`,
        [parsed.data.area, parsed.data.description, parsed.data.photo ?? null, userId]
      );
    } else {
      const { rows: merchants } = await client.query(
        `insert into public.merchants (name, kind, is_active)
         values ($1, 'retail', true)
         returning id`,
        [parsed.data.name]
      );
      merchantId = String(merchants[0].id);
      await client.query(
        `insert into public.bazaar_shop_profiles
           (user_id, merchant_id, area, description, photo)
         values ($1, $2, $3, $4, $5)`,
        [userId, merchantId, parsed.data.area, parsed.data.description, parsed.data.photo ?? null]
      );
    }

    await client.query('commit');
    transactionStarted = false;
    clearCatalogCache();
    res.json({
      shop: {
        name: parsed.data.name,
        area: parsed.data.area,
        description: parsed.data.description,
        photo: parsed.data.photo ?? null,
      },
    });
  } catch (err) {
    if (client && transactionStarted) {
      try {
        await client.query('rollback');
      } catch (rollbackError) {
        console.error('Could not roll back the Bazaar shop transaction:', rollbackError);
      }
    }
    next(err);
  } finally {
    client?.release();
  }
});

bazaarRouter.post('/bazaar-listing', requireAuth, async (req, res, next) => {
  const parsed = listingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  let client;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query('begin');
    transactionStarted = true;
    const shop = await getShopForUser(client, String(req.user.id), true);
    if (!shop) {
      await client.query('rollback');
      transactionStarted = false;
      return res.status(409).json({ error: 'Set up your shop before publishing products.' });
    }

    const prefix = shop.name.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'BZR';
    const { rows: skuRows } = await client.query(
      `select count(*) + 1 as n from public.products where sku like $1`,
      [`${prefix}-%`]
    );
    const sku = `${prefix}-${String(skuRows[0].n).padStart(3, '0')}`;
    const { rows: inserted } = await client.query(
      `insert into public.products
         (sku, name, category_id, merchant_id, unit, reorder_point, price, is_active)
       values ($1, $2, $3, $4, 'pc', 0, $5, true)
       returning id, sku, name, price, created_at`,
      [sku, parsed.data.name, CATEGORY_MAP[parsed.data.category], shop.merchant_id, parsed.data.price]
    );
    const product = inserted[0];
    await client.query(
      `insert into public.bazaar_product_details
         (product_id, description, stock, photos)
       values ($1, $2, $3, $4::jsonb)`,
      [String(product.id), parsed.data.description, parsed.data.stock, JSON.stringify(parsed.data.photos)]
    );
    await client.query('commit');
    transactionStarted = false;
    clearCatalogCache();
    res.status(201).json({
      ...product,
      seller: shop.name,
      category: parsed.data.category,
      stock: parsed.data.stock,
      description: parsed.data.description,
      photos: parsed.data.photos,
      seller_area: shop.area,
      seller_description: shop.description,
      seller_photo: shop.photo,
    });
  } catch (err) {
    if (client && transactionStarted) {
      try {
        await client.query('rollback');
      } catch (rollbackError) {
        console.error('Could not roll back the Bazaar product transaction:', rollbackError);
      }
    }
    next(err);
  } finally {
    client?.release();
  }
});
