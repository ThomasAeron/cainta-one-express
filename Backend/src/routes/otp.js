import { Router } from 'express';
import { z } from 'zod';

import { query } from '../db.js';
import { sendOtp } from '../../otp.js';

export const otpRouter = Router();

otpRouter.post('/send', async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const lowerEmail = email.toLowerCase();
    const existing = await query('select id from users where email = $1', [lowerEmail]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }

    await sendOtp(lowerEmail);

    res.json({ message: 'Verification code sent to email.' });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});
