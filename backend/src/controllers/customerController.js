const { pool } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const asyncHandler = require('../utils/asyncHandler');

const listCustomers = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM customers WHERE business_id = ? ORDER BY name ASC', [
    req.user.businessId,
  ]);
  res.json({ success: true, customers: rows });
});

const createCustomer = asyncHandler(async (req, res) => {
  const { name, phone, email, creditLimit } = req.body;
  if (!name) throw new AppError('Customer name is required', 400);
  const [result] = await pool.query(
    'INSERT INTO customers (business_id, name, phone, email, credit_limit) VALUES (?,?,?,?,?)',
    [req.user.businessId, name, phone || null, email || null, creditLimit || 0]
  );
  res.status(201).json({ success: true, customerId: result.insertId });
});

// GET /api/customers/:id/history — purchase history + simple churn/CLV signals
const getCustomerInsights = asyncHandler(async (req, res) => {
  const [[customer]] = await pool.query('SELECT * FROM customers WHERE id = ? AND business_id = ?', [
    req.params.id, req.user.businessId,
  ]);
  if (!customer) throw new AppError('Customer not found', 404);

  const [invoices] = await pool.query(
    'SELECT id, invoice_number, grand_total, created_at FROM invoices WHERE customer_id = ? ORDER BY created_at DESC',
    [req.params.id]
  );

  const totalSpent = invoices.reduce((s, i) => s + Number(i.grand_total), 0);
  const lastPurchase = invoices[0]?.created_at || null;
  const daysSinceLastPurchase = lastPurchase
    ? Math.floor((Date.now() - new Date(lastPurchase).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Simple churn-risk heuristic: no purchase in 60+ days despite prior activity
  const churnRisk = invoices.length > 0 && daysSinceLastPurchase !== null && daysSinceLastPurchase > 60 ? 'high' : 'low';

  res.json({
    success: true,
    customer,
    purchaseHistory: invoices,
    lifetimeValue: totalSpent,
    daysSinceLastPurchase,
    churnRisk,
    recommendedOffer: churnRisk === 'high' ? 'Send a win-back discount (10-15% off next purchase)' : null,
  });
});

module.exports = { listCustomers, createCustomer, getCustomerInsights };
