const { pool } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const asyncHandler = require('../utils/asyncHandler');

const listExpenses = asyncHandler(async (req, res) => {
  const { from, to, category } = req.query;
  let sql = 'SELECT * FROM expenses WHERE business_id = ?';
  const params = [req.user.businessId];
  if (from && to) {
    sql += ' AND expense_date BETWEEN ? AND ?';
    params.push(from, to);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  sql += ' ORDER BY expense_date DESC LIMIT 200';
  const [rows] = await pool.query(sql, params);
  res.json({ success: true, expenses: rows });
});

const createExpense = asyncHandler(async (req, res) => {
  const { category, description, amount, expenseDate } = req.body;
  if (!category || !amount) throw new AppError('Category and amount are required', 400);
  const [result] = await pool.query(
    'INSERT INTO expenses (business_id, category, description, amount, expense_date) VALUES (?,?,?,?,?)',
    [req.user.businessId, category, description || null, amount, expenseDate || new Date().toISOString().slice(0, 10)]
  );
  res.status(201).json({ success: true, expenseId: result.insertId });
});

module.exports = { listExpenses, createExpense };
