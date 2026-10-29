import { Router } from 'express';
import { z } from 'zod';

import { query } from '../db.js';
import { requireAuth } from '../auth.js';

export const addressesRouter = Router();

const createAddressSchema = z.object({
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).nullable().optional(),
  area: z.enum([
    'San Andres',
    'San Isidro',
    'San Juan',
    'San Roque',
    'Santa Rosa',
    'Santo Domingo',
    'Santo Niño'
  ]),
  postal_code: z.string().trim().max(20).nullable().optional(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180)
});

addressesRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const parsed = createAddressSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const { line1, line2, area, postal_code, lat, lon } = parsed.data;
    const { rows } = await query(
      `insert into public.addresses (line1, line2, area, postal_code, lat, lon)
       values ($1, $2, $3, $4, $5, $6)
       returning id, line1, line2, area, postal_code, lat, lon`,
      [line1, line2 ?? null, area, postal_code ?? null, lat, lon]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});
