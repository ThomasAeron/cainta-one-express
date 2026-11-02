import { Router } from 'express';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { query } from '../db.js';

export const otpRouter = Router();

const hashOtp = (code) => {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('OTP signing secret must be configured with at least 32 characters.');
  }
  return createHmac('sha256', secret).update(code).digest('hex');
};

otpRouter.post('/send', async (req, res, next) => {
  try {
    const parsed = z.object({ email: z.string().email().max(254) }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const { email } = parsed.data;
    const lowerEmail = email.toLowerCase();
    const resendApiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;

    if (!resendApiKey || !from) {
      throw new Error('Resend email configuration is missing.');
    }

    const existing = await query('select id from users where email = $1', [lowerEmail]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }

    const code = randomInt(100000, 1000000).toString();
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: lowerEmail,
        subject: 'Your Cainta One Express verification code',
        text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes. If you didn't request this, ignore this email.`,
        html: `<p>Your verification code is:</p><h2>${code}</h2><p>This code expires in 10 minutes.</p>`,
      }),
    });

    if (!resendResponse.ok) {
      console.error('Resend API rejected a verification email.');
      throw new Error('Failed to send verification email. Please try again later.');
    }

    const title = `OTP for ${lowerEmail}`;
    await query(
      `delete from public.notifications
       where kind = 'system' and title = $1`,
      [title]
    );
    await query(
      `insert into public.notifications (user_id, kind, title, body, related_id)
       values (null, 'system', $1, $2, null)`,
      [title, hashOtp(code)]
    );

    res.json({ message: 'Verification code sent to email.' });
  } catch (err) {
    next(err);
  }
});

export async function checkOtp(email, code) {
  const lowerEmail = email.toLowerCase();
  const { rows } = await query(
    `select id, created_at, body from public.notifications
     where kind = 'system' and title = $1
     order by created_at desc limit 1`,
    [`OTP for ${lowerEmail}`]
  );

  if (rows.length === 0) {
    throw new Error('Invalid or expired code.');
  }

  const createdAt = new Date(rows[0].created_at).getTime();
  if (Date.now() - createdAt > 10 * 60 * 1000) {
    throw new Error('Verification code has expired.');
  }

  const expectedDigest = rows[0].body;
  if (typeof expectedDigest !== 'string' || !/^[a-f0-9]{64}$/i.test(expectedDigest)) {
    throw new Error('Invalid or expired code.');
  }
  const storedDigest = Buffer.from(expectedDigest, 'hex');
  const providedDigest = Buffer.from(hashOtp(code), 'hex');
  if (!timingSafeEqual(storedDigest, providedDigest)) {
    throw new Error('Invalid or expired code.');
  }

  await query('delete from public.notifications where id = $1', [rows[0].id]);
  return true;
}