const { pool } = require('../config/db');

async function createNotification(businessId, { type, severity = 'info', title, message }) {
  // Avoid spamming duplicate unread notifications of the same type+title
  const [existing] = await pool.query(
    `SELECT id FROM notifications WHERE business_id = ? AND type = ? AND title = ? AND is_read = 0
     AND created_at >= DATE_SUB(NOW(), INTERVAL 12 HOUR)`,
    [businessId, type, title]
  );
  if (existing.length > 0) return null;

  const [result] = await pool.query(
    `INSERT INTO notifications (business_id, type, severity, title, message) VALUES (?, ?, ?, ?, ?)`,
    [businessId, type, severity, title, message]
  );
  return { id: result.insertId, type, severity, title, message };
}

/**
 * Runs the standard set of automatic checks for a business. Intended to be called
 * on a schedule (e.g. daily cron) as well as opportunistically after key events
 * like invoice creation.
 */
async function runAutomaticChecks(businessId) {
  const created = [];

  // Low stock
  const [lowStock] = await pool.query(
    `SELECT name, quantity, reorder_level FROM products
     WHERE business_id = ? AND is_active = 1 AND quantity <= reorder_level AND quantity > 0`,
    [businessId]
  );
  for (const p of lowStock) {
    const n = await createNotification(businessId, {
      type: 'low_stock',
      severity: 'warning',
      title: `Low stock: ${p.name}`,
      message: `Only ${p.quantity} unit(s) left, at or below reorder level of ${p.reorder_level}.`,
    });
    if (n) created.push(n);
  }

  // Out of stock
  const [outOfStock] = await pool.query(
    `SELECT name FROM products WHERE business_id = ? AND is_active = 1 AND quantity = 0`,
    [businessId]
  );
  for (const p of outOfStock) {
    const n = await createNotification(businessId, {
      type: 'out_of_stock',
      severity: 'critical',
      title: `Out of stock: ${p.name}`,
      message: `${p.name} is completely out of stock.`,
    });
    if (n) created.push(n);
  }

  // Expiring soon (30 days)
  const [expiring] = await pool.query(
    `SELECT name, expiry_date FROM products
     WHERE business_id = ? AND is_active = 1 AND expiry_date IS NOT NULL
       AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND expiry_date >= CURDATE()`,
    [businessId]
  );
  for (const p of expiring) {
    const n = await createNotification(businessId, {
      type: 'expiry',
      severity: 'warning',
      title: `Expiring soon: ${p.name}`,
      message: `${p.name} expires on ${p.expiry_date}.`,
    });
    if (n) created.push(n);
  }

  // Loan EMI due within 5 days
  const [loans] = await pool.query(`SELECT lender, emi_amount, emi_due_day FROM loans WHERE business_id = ?`, [businessId]);
  const today = new Date();
  for (const loan of loans) {
    const dueThisMonth = new Date(today.getFullYear(), today.getMonth(), loan.emi_due_day);
    const diffDays = Math.ceil((dueThisMonth - today) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 5) {
      const n = await createNotification(businessId, {
        type: 'loan_emi',
        severity: 'warning',
        title: 'Loan EMI due soon',
        message: `${loan.lender || 'Lender'} EMI of ₹${Number(loan.emi_amount).toFixed(0)} is due in ${diffDays} day(s).`,
      });
      if (n) created.push(n);
    }
  }

  // Negative cash flow (last 30 days)
  const [[cash]] = await pool.query(
    `SELECT
       (SELECT COALESCE(SUM(grand_total),0) FROM invoices WHERE business_id = ? AND payment_status='paid' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS inflow,
       (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE business_id = ? AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS outflow`,
    [businessId, businessId]
  );
  if (Number(cash.inflow) - Number(cash.outflow) < 0) {
    const n = await createNotification(businessId, {
      type: 'cash_flow',
      severity: 'critical',
      title: 'Cash flow is negative',
      message: `Expenses have exceeded revenue over the last 30 days.`,
    });
    if (n) created.push(n);
  }

  return created;
}

module.exports = { createNotification, runAutomaticChecks };
