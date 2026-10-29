import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { query } from '../db.js';

export const otpRouter = Router();

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
};

otpRouter.post('/send', async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const lowerEmail = email.toLowerCase();

    const existing = await query('select id from users where email = $1', [lowerEmail]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }

    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await query(
      `insert into public.notifications (user_id, kind, title, body, related_id)
       values (null, 'system', $1, $2, null)`,
      [`OTP for ${lowerEmail}: ${code}`, `Expires at ${expiresAt}`]
    );

    await getTransporter().sendMail({
      from: `"Cainta One Express" <${process.env.GMAIL_USER}>`,
      to: lowerEmail,
      subject: 'Your Cainta One Express verification code',
      text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes. If you didn't request this, ignore this email.`,
      html: `<p>Your verification code is:</p><h2>${code}</h2><p>This code expires in 10 minutes.</p>`,
    });

    console.log(`OTP sent to ${lowerEmail}`);
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