const { pool } = require('../config/db');

/**
 * Rule-based recommendation engine. Runs a set of SQL heuristics against live
 * business data and writes actionable suggestions to ai_recommendations.
 * This is intentionally deterministic (not an LLM call) so it's fast, free to run
 * on a schedule/cron, and the numbers it cites are always exactly correct.
 * The chatbot (groqService) is used separately for open-ended natural language Q&A.
 */
async function generateRecommendations(businessId) {
  const recommendations = [];

  // 1. Low / soon-to-stockout inventory (based on last-14-day sales velocity)
  const [lowStock] = await pool.query(
    `SELECT p.id, p.name, p.quantity, p.reorder_level,
            COALESCE(SUM(ii.quantity), 0) / 14 AS daily_velocity
     FROM products p
     LEFT JOIN invoice_items ii ON ii.product_id = p.id
       AND ii.invoice_id IN (SELECT id FROM invoices WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY))
     WHERE p.business_id = ? AND p.is_active = 1
     GROUP BY p.id, p.name, p.quantity, p.reorder_level
     HAVING p.quantity <= p.reorder_level OR (daily_velocity > 0 AND p.quantity / daily_velocity <= 5)`,
    [businessId]
  );

  for (const row of lowStock) {
    const daysLeft = row.daily_velocity > 0 ? Math.max(1, Math.round(row.quantity / row.daily_velocity)) : null;
    const suggestedOrder = Math.max(row.reorder_level * 2, Math.round((row.daily_velocity || 1) * 14));
    recommendations.push({
      category: 'inventory',
      title: `Reorder ${row.name}`,
      detail: daysLeft
        ? `Inventory for ${row.name} will finish in about ${daysLeft} day(s) at current sales pace. Recommend ordering ${suggestedOrder} units.`
        : `${row.name} is at or below its reorder level (${row.quantity} left, reorder at ${row.reorder_level}). Recommend restocking.`,
    });
  }

  // 2. Dead stock — no sales in 90 days but has inventory value
  const [deadStock] = await pool.query(
    `SELECT p.id, p.name, p.quantity, p.buying_price
     FROM products p
     WHERE p.business_id = ? AND p.is_active = 1 AND p.quantity > 0
       AND p.id NOT IN (
         SELECT DISTINCT ii.product_id FROM invoice_items ii
         JOIN invoices i ON i.id = ii.invoice_id
         WHERE i.business_id = ? AND i.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
       )`,
    [businessId, businessId]
  );
  const deadStockValue = deadStock.reduce((sum, p) => sum + p.quantity * Number(p.buying_price), 0);
  if (deadStockValue > 0) {
    recommendations.push({
      category: 'inventory',
      title: 'Clear dead stock',
      detail: `Inventory worth ₹${deadStockValue.toFixed(0)} across ${deadStock.length} product(s) has not sold in 90 days. Recommend a clearance sale.`,
    });
  }

  // 3. Sales trend — this week vs last week
  const [[thisWeek]] = await pool.query(
    `SELECT COALESCE(SUM(grand_total),0) AS total FROM invoices
     WHERE business_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
    [businessId]
  );
  const [[lastWeek]] = await pool.query(
    `SELECT COALESCE(SUM(grand_total),0) AS total FROM invoices
     WHERE business_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`,
    [businessId]
  );
  const thisWeekTotal = Number(thisWeek.total);
  const lastWeekTotal = Number(lastWeek.total);
  if (lastWeekTotal > 0) {
    const pctChange = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;
    if (pctChange <= -10) {
      recommendations.push({
        category: 'sales',
        title: 'Sales are down this week',
        detail: `Sales decreased ${Math.abs(pctChange).toFixed(0)}% versus last week (₹${thisWeekTotal.toFixed(0)} vs ₹${lastWeekTotal.toFixed(0)}). Recommend running a festival or weekend offer.`,
      });
    }
  }

  // 4. Expense growth
  const [[thisMonthExp]] = await pool.query(
    `SELECT COALESCE(SUM(amount),0) AS total FROM expenses
     WHERE business_id = ? AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
    [businessId]
  );
  const [[lastMonthExp]] = await pool.query(
    `SELECT COALESCE(SUM(amount),0) AS total FROM expenses
     WHERE business_id = ? AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) AND expense_date < DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
    [businessId]
  );
  const thisMonthExpTotal = Number(thisMonthExp.total);
  const lastMonthExpTotal = Number(lastMonthExp.total);
  if (lastMonthExpTotal > 0) {
    const pctChange = ((thisMonthExpTotal - lastMonthExpTotal) / lastMonthExpTotal) * 100;
    if (pctChange >= 15) {
      recommendations.push({
        category: 'expense',
        title: 'Expenses are rising',
        detail: `Operating expenses increased ${pctChange.toFixed(0)}% versus last month. Review electricity and misc costs for savings opportunities.`,
      });
    }
  }

  // 5. Customer credit risk
  const [creditRisk] = await pool.query(
    `SELECT name, pending_balance FROM customers WHERE business_id = ? AND pending_balance > credit_limit * 0.8 AND credit_limit > 0`,
    [businessId]
  );
  for (const c of creditRisk) {
    recommendations.push({
      category: 'customer',
      title: `${c.name} is near their credit limit`,
      detail: `Pending balance of ₹${Number(c.pending_balance).toFixed(0)} is approaching the agreed credit limit. Consider following up before extending further credit.`,
    });
  }

  // Persist fresh recommendations (dedupe by title+category for this business)
  for (const rec of recommendations) {
    const [existing] = await pool.query(
      `SELECT id FROM ai_recommendations WHERE business_id = ? AND title = ? AND is_dismissed = 0`,
      [businessId, rec.title]
    );
    if (existing.length === 0) {
      await pool.query(
        `INSERT INTO ai_recommendations (business_id, category, title, detail) VALUES (?, ?, ?, ?)`,
        [businessId, rec.category, rec.title, rec.detail]
      );
    }
  }

  return recommendations;
}

module.exports = { generateRecommendations };
