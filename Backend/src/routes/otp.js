import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { query } from '../db.js';

export const otpRouter = Router();

otpRouter.post('/send', async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const lowerEmail = email.toLowerCase();
    const existing = await query('select id from users where email = $1', [lowerEmail]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }

    if (!process.env.BREVO_API_KEY) {
      return res.status(503).json({ error: 'Email verification is not configured.' });
    }

    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'Cainta One Express', email: 'thomasaeronbonavente@gmail.com' },
        to: [{ email: lowerEmail }],
        subject: 'Your Cainta One Express verification code',
        textContent: `Your verification code is: ${code}\n\nThis code expires in 10 minutes. If you did not request this, ignore this email.`
      }),
      signal: AbortSignal.timeout(15_000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Brevo request failed.', { status: response.status, error: errorText });
      throw new Error('Failed to send verification email.');
    }

    await query(
      `insert into public.notifications (user_id, kind, title, body, related_id)
       values (null, 'system', $1, $2, null)`,
      [`OTP for ${lowerEmail}: ${code}`, `Expires at ${expiresAt}`]
    );

    res.json({ message: 'Verification code sent to email.' });
  } catch (err) {
    next(err);
  }
});

export async function checkOtp(email, code) {
  const lowerEmail = email.toLowerCase();
  const { rows } = await query(
    `select id, created_at from public.notifications
     where kind = 'system' and title = $1
     order by created_at desc limit 1`,
    [`OTP for ${lowerEmail}: ${code}`]
  );

  if (rows.length === 0) {
    throw new Error('Invalid or expired code.');
  }

  const createdAt = new Date(rows[0].created_at).getTime();
  if (Date.now() - createdAt > 10 * 60 * 1000) {
    throw new Error('Verification code has expired.');
  }

  await query('delete from public.notifications where id = $1', [rows[0].id]);
  return true;
}
