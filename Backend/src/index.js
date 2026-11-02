import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pool } from './db.js';
import { authRouter } from './routes/auth.js';
import { itemsRouter } from './routes/items.js';
import { bazaarRouter } from './routes/bazaar.js';
import { inventoryRouter } from './routes/inventory.js';
import { notificationsRouter } from './routes/notifications.js';
import { shipmentsRouter } from './routes/shipments.js';
import { chatRouter } from './routes/chat-route.js';
import { locationRouter } from './routes/location.js';
import { addressesRouter } from './routes/addresses.js';
import { otpRouter } from './routes/otp.js';
import { paymentsRouter } from './routes/payments.js';
import {
  advanceSimulatedDeliveries,
  recalculateActiveSimulatedDeliveries
} from './simulated-deliveries.js';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  });
  next();
});

const origins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: '3mb' }));
app.use(express.static(path.join(__dirname, '..', '..')));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('select 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    console.error('HEALTH CHECK FAILED:', err);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
    });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/items', itemsRouter);
app.use('/api/items', bazaarRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/location', locationRouter);
app.use('/api/addresses', addressesRouter);
app.use('/api/otp', otpRouter);
app.use('/api/payments', paymentsRouter);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT) || 8000;
let advancingDeliveries = false;
const advanceDueDeliveries = async () => {
  if (advancingDeliveries) return;
  advancingDeliveries = true;
  try {
    await advanceSimulatedDeliveries(pool);
  } catch (error) {
    console.error('Could not advance simulated food deliveries:', error);
  } finally {
    advancingDeliveries = false;
  }
};

const startServer = async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }

  await recalculateActiveSimulatedDeliveries(pool);
  await advanceDueDeliveries();
  app.listen(port, () => {
    console.log(`Cainta One API listening on http://127.0.0.1:${port}`);
  });
  setInterval(advanceDueDeliveries, 10_000);
};

void startServer().catch(async (error) => {
  console.error('Could not initialize simulated delivery schedules:', error);
  await pool.end();
  process.exitCode = 1;
});