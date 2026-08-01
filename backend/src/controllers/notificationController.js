const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { runAutomaticChecks } = require('../services/notificationService');

const listNotifications = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM notifications WHERE business_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.user.businessId]
  );
  res.json({ success: true, notifications: rows });
});

const markRead = asyncHandler(async (req, res) => {
  await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND business_id = ?', [
    req.params.id, req.user.businessId,
  ]);
  res.json({ success: true });
});

const markAllRead = asyncHandler(async (req, res) => {
  await pool.query('UPDATE notifications SET is_read = 1 WHERE business_id = ?', [req.user.businessId]);
  res.json({ success: true });
});

// Manually trigger the automatic check sweep (also runs after invoice creation / on a cron in production)
const runChecks = asyncHandler(async (req, res) => {
  const created = await runAutomaticChecks(req.user.businessId);
  res.json({ success: true, created });
});

module.exports = { listNotifications, markRead, markAllRead, runChecks };
