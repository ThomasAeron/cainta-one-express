import { Router } from 'express';
import { z } from 'zod';

import { query } from '../db.js';
import { hashPassword, requireAuth, signToken, verifyPassword } from '../auth.js';
import { checkOtp } from './otp.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(72),
  full_name: z.string().min(1).max(120),
  phone: z.string().max(20).optional(),
  otp_code: z.string().length(6), // ADD THIS
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    
    const { email, password, full_name, phone, otp_code } = parsed.data;
    const lowerEmail = email.toLowerCase();

    // Verify the OTP before creating the account
    try {
      await checkOtp(lowerEmail, otp_code);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const existing = await query('select id from users where email = $1', [lowerEmail]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);

    const inserted = await query(
      `insert into users (email, password_hash, full_name, phone, role_id)
       values ($1, $2, $3, $4, (select id from roles where name = 'customer'))
       returning id, email, full_name`,
      [lowerEmail, passwordHash, full_name, phone ?? null]
    );

    const token = signToken({
      sub: inserted.rows[0].id,
      email: inserted.rows[0].email,
    });

    res.status(201).json({
      access_token: token,
      token_type: 'bearer',
      user: inserted.rows[0],
    });
  } catch (err) {
    next(err);
  }
});


const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const { email, password } = parsed.data;

    const { rows } = await query(
      'select id, email, full_name, password_hash, is_active from users where email = $1',
      [email.toLowerCase()]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }
    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account disabled' });
    }
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }

    const token = signToken({ sub: user.id, email: user.email });
    res.json({
      access_token: token,
      token_type: 'bearer',
      user: { id: user.id, email: user.email, full_name: user.full_name },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});