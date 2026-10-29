import { Router } from 'express';

import { query } from '../db.js';
import { requireAuth } from '../auth.js';

export const notificationsRouter = Router();

// ------------------------------------------------------------------
// GET /api/notifications
// List the current user's notifications, newest first.
// Supports ?unread=true to filter, ?limit=N to cap (default 50).
// ------------------------------------------------------------------
notificationsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const onlyUnread = req.query.unread === 'true';

    const { rows } = await query(
      `select id, kind, title, body, related_id, read_at, created_at
       from public.notifications
       where user_id = $1
         ${onlyUnread ? 'and read_at is null' : ''}
       order by created_at desc
       limit $2`,
      [req.user.id, limit]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------
// GET /api/notifications/count
// Small endpoint for polling: total + unread count.
// ------------------------------------------------------------------
notificationsRouter.get('/count', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `select
         count(*) filter (where read_at is null) as unread,
         count(*)                                 as total
       from public.notifications
       where user_id = $1`,
      [req.user.id]
    );
    res.json({
      unread: Number(rows[0].unread),
      total: Number(rows[0].total),
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------
// POST /api/notifications/:id/read
// Mark one notification as read. Only the owner can mark their own.
// ------------------------------------------------------------------
notificationsRouter.post('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `update public.notifications
       set read_at = coalesce(read_at, now())
       where id = $1 and user_id = $2
       returning id, read_at`,
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------
// POST /api/notifications/read-all
// Mark every unread notification for the user as read.
// ------------------------------------------------------------------
notificationsRouter.post('/read-all', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `update public.notifications
       set read_at = now()
       where user_id = $1 and read_at is null
       returning id`,
      [req.user.id]
    );
    res.json({ marked: result.rowCount });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------
// DELETE /api/notifications/:id
// Hard-delete a notification. Owner only.
// Rationale: notifications are transient UI state, not audit records,
// so hard-delete is appropriate.
// ------------------------------------------------------------------
notificationsRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `delete from public.notifications
       where id = $1 and user_id = $2
       returning id`,
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ id: result.rows[0].id, deleted: true });
  } catch (err) {
    next(err);
  }
});