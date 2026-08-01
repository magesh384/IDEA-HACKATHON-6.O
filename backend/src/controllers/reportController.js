const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { computeProfitAndLoss } = require('../services/plService');

// GET /api/reports/gst?from=&to=
const gstReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const dateFilter = from && to ? 'AND created_at BETWEEN ? AND ?' : '';
  const params = from && to ? [req.user.businessId, from, to] : [req.user.businessId];

  const [[totals]] = await pool.query(
    `SELECT COALESCE(SUM(cgst),0) AS cgst, COALESCE(SUM(sgst),0) AS sgst,
            COALESCE(SUM(igst),0) AS igst, COALESCE(SUM(cess),0) AS cess,
            COALESCE(SUM(cgst+sgst+igst+cess),0) AS total_gst
     FROM invoices WHERE business_id = ? ${dateFilter}`,
    params
  );

  const [byRate] = await pool.query(
    `SELECT ii.gst_rate, COALESCE(SUM(ii.line_total),0) AS taxable_value,
            COALESCE(SUM(ii.line_total * ii.gst_rate / 100),0) AS gst_amount
     FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
     WHERE i.business_id = ? ${dateFilter.replace('created_at', 'i.created_at')}
     GROUP BY ii.gst_rate ORDER BY ii.gst_rate`,
    params
  );

  res.json({ success: true, totals, byRate });
});

// GET /api/reports/profit-loss?from=&to=
const profitLossReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const pl = await computeProfitAndLoss(req.user.businessId, { fromDate: from, toDate: to });
  res.json({ success: true, report: pl });
});

// GET /api/reports/invoices?from=&to=
const invoiceReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const dateFilter = from && to ? 'AND created_at BETWEEN ? AND ?' : '';
  const params = from && to ? [req.user.businessId, from, to] : [req.user.businessId];
  const [rows] = await pool.query(
    `SELECT invoice_number, subtotal, discount, cgst, sgst, igst, cess, grand_total, payment_method, payment_status, created_at
     FROM invoices WHERE business_id = ? ${dateFilter} ORDER BY created_at DESC`,
    params
  );
  res.json({ success: true, invoices: rows });
});

// GET /api/reports/expenses?from=&to=
const expenseReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const dateFilter = from && to ? 'AND expense_date BETWEEN ? AND ?' : '';
  const params = from && to ? [req.user.businessId, from, to] : [req.user.businessId];
  const [rows] = await pool.query(
    `SELECT category, description, amount, expense_date FROM expenses WHERE business_id = ? ${dateFilter} ORDER BY expense_date DESC`,
    params
  );
  res.json({ success: true, expenses: rows });
});

module.exports = { gstReport, profitLossReport, invoiceReport, expenseReport };
