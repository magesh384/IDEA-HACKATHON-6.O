const { pool } = require('../config/db');

const PERIOD_INTERVALS = {
  daily: 'INTERVAL 1 DAY',
  weekly: 'INTERVAL 7 DAY',
  monthly: 'INTERVAL 30 DAY',
  quarterly: 'INTERVAL 90 DAY',
  half_yearly: 'INTERVAL 180 DAY',
  yearly: 'INTERVAL 365 DAY',
  lifetime: null,
};

async function getRevenueForPeriod(businessId, period = 'monthly') {
  const interval = PERIOD_INTERVALS[period];
  const where = interval
    ? `business_id = ? AND created_at >= DATE_SUB(NOW(), ${interval})`
    : 'business_id = ?';
  const [rows] = await pool.query(
    `SELECT
       COALESCE(SUM(grand_total), 0) AS revenue,
       COALESCE(SUM(cost_total), 0) AS cost,
       COALESCE(SUM(cgst + sgst + igst + cess), 0) AS gst_collected,
       COUNT(*) AS order_count
     FROM invoices WHERE ${where}`,
    [businessId]
  );
  const row = rows[0];
  return {
    revenue: Number(row.revenue),
    cost: Number(row.cost),
    grossProfit: Number(row.revenue) - Number(row.cost),
    gstCollected: Number(row.gst_collected),
    orderCount: Number(row.order_count),
  };
}

async function getTodayStats(businessId) {
  const [[sales]] = await pool.query(
    `SELECT COALESCE(SUM(grand_total),0) AS revenue, COALESCE(SUM(cost_total),0) AS cost,
            COALESCE(SUM(cgst+sgst+igst+cess),0) AS tax, COUNT(*) AS orders
     FROM invoices WHERE business_id = ? AND DATE(created_at) = CURDATE()`,
    [businessId]
  );
  const [[pending]] = await pool.query(
    `SELECT COALESCE(SUM(grand_total),0) AS pending_amount, COUNT(*) AS pending_count
     FROM invoices WHERE business_id = ? AND payment_status IN ('pending','partial')`,
    [businessId]
  );
  const [[lowStock]] = await pool.query(
    `SELECT COUNT(*) AS low_stock_count FROM products
     WHERE business_id = ? AND is_active = 1 AND quantity <= reorder_level AND quantity > 0`,
    [businessId]
  );
  const [[outOfStock]] = await pool.query(
    `SELECT COUNT(*) AS out_of_stock_count FROM products
     WHERE business_id = ? AND is_active = 1 AND quantity = 0`,
    [businessId]
  );

  return {
    todaySales: Number(sales.revenue),
    todayProfit: Number(sales.revenue) - Number(sales.cost),
    todayExpenses: 0, // combined with getExpensesToday in controller if needed
    todayTax: Number(sales.tax),
    todayOrders: Number(sales.orders),
    pendingPayments: Number(pending.pending_amount),
    pendingCount: Number(pending.pending_count),
    lowStockCount: Number(lowStock.low_stock_count),
    outOfStockCount: Number(outOfStock.out_of_stock_count),
  };
}

async function getRevenueTrend(businessId, days = 30) {
  const [rows] = await pool.query(
    `SELECT DATE(created_at) AS date,
            COALESCE(SUM(grand_total),0) AS revenue,
            COALESCE(SUM(grand_total - cost_total),0) AS profit
     FROM invoices
     WHERE business_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(created_at)
     ORDER BY DATE(created_at) ASC`,
    [businessId, days]
  );
  return rows.map((r) => ({ date: r.date, revenue: Number(r.revenue), profit: Number(r.profit) }));
}

async function getExpenseBreakdown(businessId, days = 30) {
  const [rows] = await pool.query(
    `SELECT category, COALESCE(SUM(amount),0) AS total
     FROM expenses
     WHERE business_id = ? AND expense_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY category`,
    [businessId, days]
  );
  return rows.map((r) => ({ category: r.category, total: Number(r.total) }));
}

async function getGstChart(businessId, days = 180) {
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
            COALESCE(SUM(cgst+sgst),0) AS cgst_sgst,
            COALESCE(SUM(igst),0) AS igst,
            COALESCE(SUM(cess),0) AS cess
     FROM invoices
     WHERE business_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY month ORDER BY month ASC`,
    [businessId, days]
  );
  return rows;
}

async function getTopProducts(businessId, limit = 5) {
  const [rows] = await pool.query(
    `SELECT p.id, p.name, SUM(ii.quantity) AS units_sold,
            SUM(ii.line_total) AS revenue,
            SUM(ii.line_total - (ii.buying_price * ii.quantity)) AS profit
     FROM invoice_items ii
     JOIN invoices i ON i.id = ii.invoice_id
     JOIN products p ON p.id = ii.product_id
     WHERE i.business_id = ?
     GROUP BY p.id, p.name
     ORDER BY profit DESC
     LIMIT ?`,
    [businessId, limit]
  );
  return rows.map((r) => ({ ...r, units_sold: Number(r.units_sold), revenue: Number(r.revenue), profit: Number(r.profit) }));
}

async function getInventoryValue(businessId) {
  const [[row]] = await pool.query(
    `SELECT COALESCE(SUM(quantity * buying_price),0) AS cost_value,
            COALESCE(SUM(quantity * selling_price),0) AS retail_value
     FROM products WHERE business_id = ? AND is_active = 1`,
    [businessId]
  );
  return { costValue: Number(row.cost_value), retailValue: Number(row.retail_value) };
}

async function getCashFlow(businessId, days = 30) {
  const [[inflow]] = await pool.query(
    `SELECT COALESCE(SUM(grand_total),0) AS total FROM invoices
     WHERE business_id = ? AND payment_status = 'paid' AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
    [businessId, days]
  );
  const [[outflow]] = await pool.query(
    `SELECT COALESCE(SUM(amount),0) AS total FROM expenses
     WHERE business_id = ? AND expense_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
    [businessId, days]
  );
  const [[salaries]] = await pool.query(
    `SELECT COALESCE(SUM(monthly_salary),0) AS total FROM employees WHERE business_id = ? AND is_active = 1`,
    [businessId]
  );
  const cashIn = Number(inflow.total);
  const cashOut = Number(outflow.total) + Number(salaries.total);
  return { cashIn, cashOut, netCashFlow: cashIn - cashOut };
}

module.exports = {
  getRevenueForPeriod,
  getTodayStats,
  getRevenueTrend,
  getExpenseBreakdown,
  getGstChart,
  getTopProducts,
  getInventoryValue,
  getCashFlow,
};
