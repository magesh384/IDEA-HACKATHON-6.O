const { pool } = require('../config/db');
const { round2 } = require('../utils/gst');

/**
 * Computes a full Profit & Loss statement for a business over a date range.
 * Called after every invoice (via invoice controller) to keep dashboards fresh,
 * and directly by the reports/dashboard endpoints.
 */
async function computeProfitAndLoss(businessId, { fromDate, toDate } = {}) {
  const dateFilter = fromDate && toDate ? 'AND created_at BETWEEN ? AND ?' : '';
  const invoiceParams = fromDate && toDate ? [businessId, fromDate, toDate] : [businessId];

  const [[sales]] = await pool.query(
    `SELECT COALESCE(SUM(grand_total),0) AS revenue,
            COALESCE(SUM(cost_total),0) AS cost_of_goods,
            COALESCE(SUM(cgst+sgst+igst),0) AS gst_collected,
            COALESCE(SUM(cess),0) AS cess_collected
     FROM invoices WHERE business_id = ? ${dateFilter}`,
    invoiceParams
  );

  const expenseDateFilter = fromDate && toDate ? 'AND expense_date BETWEEN ? AND ?' : '';
  const expenseParams = fromDate && toDate ? [businessId, fromDate, toDate] : [businessId];

  const [expenseRows] = await pool.query(
    `SELECT category, COALESCE(SUM(amount),0) AS total FROM expenses
     WHERE business_id = ? ${expenseDateFilter} GROUP BY category`,
    expenseParams
  );

  const expensesByCategory = expenseRows.reduce((acc, r) => {
    acc[r.category] = Number(r.total);
    return acc;
  }, {});

  const [[salaryRow]] = await pool.query(
    `SELECT COALESCE(SUM(monthly_salary),0) AS total FROM employees WHERE business_id = ? AND is_active = 1`,
    [businessId]
  );

  const [[loanRow]] = await pool.query(
    `SELECT COALESCE(SUM(emi_amount),0) AS total FROM loans WHERE business_id = ?`,
    [businessId]
  );

  const revenue = Number(sales.revenue);
  const costOfGoods = Number(sales.cost_of_goods);
  const grossProfit = round2(revenue - costOfGoods);

  const operatingExpenses = round2(
    (expensesByCategory.rent || 0) +
      (expensesByCategory.electricity || 0) +
      (expensesByCategory.internet || 0) +
      (expensesByCategory.misc || 0) +
      (expensesByCategory.depreciation || 0)
  );

  const employeeSalaries = Number(salaryRow.total);
  const loanEmi = Number(loanRow.total);

  const netBusinessProfit = round2(grossProfit - operatingExpenses - employeeSalaries - loanEmi);

  return {
    revenue,
    costOfGoods,
    grossProfit,
    gstCollected: Number(sales.gst_collected),
    cessCollected: Number(sales.cess_collected),
    operatingExpenses,
    expensesByCategory,
    employeeSalaries,
    loanEmi,
    netBusinessProfit,
  };
}

module.exports = { computeProfitAndLoss };
