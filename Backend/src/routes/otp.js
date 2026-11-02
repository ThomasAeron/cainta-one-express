import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { query } from '../db.js';

export const otpRouter = Router();

otpRouter.post('/send', async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const lowerEmail = email.toLowerCase();

    // 1. Check if email already exists
    const existing = await query('select id from users where email = $1', [lowerEmail]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }

    if (!process.env.SENDGRID_API_KEY) {
      return res.status(503).json({ error: 'Email verification is not configured.' });
    }

    // 2. Generate OTP
    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 3. Send email via SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: lowerEmail }] }],
        from: { 
          email: 'thomasaeronbonavente@gmail.com', // MUST MATCH YOUR VERIFIED GMAIL
          name: 'Cainta One Express' 
        },
        subject: 'Your Cainta One Express verification code',
        content: [
          {
            type: 'text/plain',
            value: `Your verification code is: ${code}\n\nThis code expires in 10 minutes. If you didn't request this, ignore this email.`
          }
        ]
      }),
      signal: AbortSignal.timeout(15_000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid request failed.', { status: response.status, error: errorText });
      throw new Error('Failed to send verification email.');
    }

    // 4. Save the OTP only after SendGrid accepts the email.
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