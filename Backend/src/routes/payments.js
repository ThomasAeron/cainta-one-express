import { Router } from 'express';
import { z } from 'zod';

import { query } from '../db.js';
import { requireAuth } from '../auth.js';

export const paymentsRouter = Router();

const invoiceSchema = z.object({
  shipmentId: z.string().uuid(),
  amount: z.number().positive().max(1_000_000),
  description: z.string().trim().min(1).max(255).optional()
});

paymentsRouter.post('/create-invoice', requireAuth, async (req, res, next) => {
  try {
    const parsed = invoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    if (!process.env.XENDIT_SECRET_KEY) {
      return res.status(503).json({ error: 'Online payments are not configured yet.' });
    }

    const { shipmentId, amount, description } = parsed.data;
    const shipment = await query(
      `select id, tracking_number
       from public.shipments
       where id = $1::uuid and created_by = $2::uuid and coalesce(payment_status, 'unpaid') <> 'paid'`,
      [shipmentId, req.user.id]
    );
    if (shipment.rowCount === 0) {
      return res.status(404).json({ error: 'Unpaid shipment not found.' });
    }

    const auth = Buffer.from(`${process.env.XENDIT_SECRET_KEY}:`).toString('base64');
    const response = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        external_id: shipmentId,
        amount,
        description: description || `Cainta One Express Order - ${shipment.rows[0].tracking_number}`,
        invoice_duration: 86400,
        success_redirect_url: 'https://cainta-one-express.onrender.com/main.html?payment=success',
        failure_redirect_url: 'https://cainta-one-express.onrender.com/main.html?payment=failed'
      }),
      signal: AbortSignal.timeout(15_000)
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.error('Xendit invoice creation failed.', { status: response.status, error: data });
      return res.status(502).json({ error: 'Xendit could not create a payment link.' });
    }

    if (!data?.id || !data?.invoice_url) {
      console.error('Xendit returned an invalid invoice response.', { shipmentId });
      return res.status(502).json({ error: 'Xendit returned an invalid payment link.' });
    }

    await query(
      `update public.shipments
       set payment_intent_id = $1,
           payment_status = 'unpaid',
           status = 'pending_payment'
       where id = $2::uuid`,
      [data.id, shipmentId]
    );

    res.json({
      checkout_url: data.invoice_url,
      reference: shipment.rows[0].tracking_number
    });
  } catch (error) {
    console.error('Could not create Xendit invoice.', error);
    res.status(502).json({ error: 'Payment provider could not create the invoice.' });
  }
});

paymentsRouter.post('/webhook', async (req, res, next) => {
  try {
    const callbackToken = req.get('x-callback-token');
    if (!process.env.XENDIT_WEBHOOK_TOKEN || callbackToken !== process.env.XENDIT_WEBHOOK_TOKEN) {
      return res.sendStatus(401);
    }

    const event = req.body && typeof req.body === 'object' ? req.body : {};

    if (event.status !== 'PAID') {
      return res.sendStatus(200);
    }

    const shipmentId = typeof event.external_id === 'string' ? event.external_id.trim() : '';
    if (!shipmentId) {
      console.warn('Xendit paid test webhook received without external_id.', { eventId: event.id });
      return res.sendStatus(200);
    }

    if (!z.string().uuid().safeParse(shipmentId).success) {
      console.warn('Ignoring Xendit webhook with a non-shipment external_id.', {
        eventId: event.id,
        externalId: shipmentId
      });
      return res.sendStatus(200);
    }

    const paidAmount = Number(event.paid_amount);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      console.warn('Xendit paid webhook received without a valid paid_amount.', { eventId: event.id });
      return res.sendStatus(200);
    }

    const result = await query(
      `update public.shipments
       set payment_status = 'paid',
           amount_paid = $1,
           status = 'pending'
       where id = $2::uuid
         and coalesce(payment_status, 'unpaid') <> 'paid'
       returning tracking_number`,
      [paidAmount, shipmentId]
    );

    if (result.rowCount === 0) {
      const existing = await query(
        'select id from public.shipments where id = $1::uuid',
        [shipmentId]
      );
      if (existing.rowCount === 0) {
        console.warn('Xendit payment did not match a shipment.', { externalId: shipmentId });
        return res.sendStatus(404);
      }
    } else {
      console.log(`Xendit payment confirmed for shipment ${result.rows[0].tracking_number}.`);
    }

    return res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});
