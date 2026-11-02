import { randomInt } from 'node:crypto';

import { query } from './src/db.js';

const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

const normalizeEmail = (email) => email.trim().toLowerCase();

async function sendEmail(email, code) {
  if (!process.env.BREVO_API_KEY) {
    const error = new Error('Email verification is not configured.');
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME || 'Cainta One Express',
        email: process.env.BREVO_SENDER_EMAIL || 'thomasaeronbonavente@gmail.com',
      },
      to: [{ email }],
      subject: 'Your Cainta One Express verification code',
      textContent: `Your verification code is: ${code}\n\nThis code expires in ${OTP_TTL_MINUTES} minutes. If you did not request this, ignore this email.`,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Brevo request failed.', { status: response.status, error: errorText });
    throw new Error('Failed to send verification email.');
  }
}

export async function sendOtp(email) {
  const normalizedEmail = normalizeEmail(email);
  const code = randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  const title = `OTP for ${normalizedEmail}: ${code}`;

  const existing = await query(
    `select created_at
     from public.notifications
     where kind = 'system' and title like $1
     order by created_at desc
     limit 1`,
    [`OTP for ${normalizedEmail}:%`]
  );
  if (existing.rows.length > 0) {
    const age = Date.now() - new Date(existing.rows[0].created_at).getTime();
    if (age < OTP_RESEND_COOLDOWN_MS) {
      const error = new Error('Please wait before requesting another verification code.');
      error.statusCode = 429;
      throw error;
    }
  }

  await query(
    `insert into public.notifications (user_id, kind, title, body, related_id)
     values (null, 'system', $1, $2, null)`,
    [title, `Expires at ${expiresAt.toISOString()}`]
  );

  try {
    await sendEmail(normalizedEmail, code);
  } catch (error) {
    await query(
      `delete from public.notifications
       where kind = 'system' and title = $1`,
      [title]
    );
    throw error;
  }
}

export async function checkOtp(email, code) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = code.trim();
  if (!/^\d{6}$/.test(normalizedCode)) {
    throw new Error('Invalid or expired code.');
  }

  const { rows } = await query(
    `select id, created_at, body
     from public.notifications
     where kind = 'system' and title = $1
     order by created_at desc
     limit 1`,
    [`OTP for ${normalizedEmail}: ${normalizedCode}`]
  );
  const verification = rows[0];
  if (!verification) {
    throw new Error('Invalid or expired code.');
  }

  const expiresAt = typeof verification.body === 'string'
    ? verification.body.match(/^Expires at (.+)$/)?.[1]
    : null;
  if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
    throw new Error('Invalid or expired code.');
  }

  const deleted = await query(
    `delete from public.notifications
     where id = $1
     returning id`,
    [verification.id]
  );
  if (deleted.rowCount !== 1) {
    throw new Error('Invalid or expired code.');
  }
}
