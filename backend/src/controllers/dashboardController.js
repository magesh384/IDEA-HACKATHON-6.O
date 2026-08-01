const analytics = require('../services/analyticsService');
const { computeProfitAndLoss } = require('../services/plService');
const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/dashboard/summary — widgets for the executive dashboard
const getSummary = asyncHandler(async (req, res) => {
  const businessId = req.user.businessId;

  const [today, expensesToday, inventoryValue, unreadNotifications, activeRecommendations] = await Promise.all([
    analytics.getTodayStats(businessId),
    pool.query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE business_id = ? AND expense_date = CURDATE()`,
      [businessId]
    ),
    analytics.getInventoryValue(businessId),
    pool.query(`SELECT COUNT(*) AS count FROM notifications WHERE business_id = ? AND is_read = 0`, [businessId]),
    pool.query(`SELECT COUNT(*) AS count FROM ai_recommendations WHERE business_id = ? AND is_dismissed = 0`, [businessId]),
  ]);

  // Simple composite "Business Health Score" (0-100): profit margin + stock health + cash flow signal
  const cashFlow = await analytics.getCashFlow(businessId, 30);
  const monthRevenue = await analytics.getRevenueForPeriod(businessId, 'monthly');
  const profitMargin = monthRevenue.revenue > 0 ? monthRevenue.grossProfit / monthRevenue.revenue : 0;

  let healthScore = 50;
  healthScore += Math.max(-20, Math.min(20, profitMargin * 100 * 0.5)); // profit margin contributes up to ±20
  healthScore += cashFlow.netCashFlow >= 0 ? 15 : -15;
  healthScore -= Math.min(15, today.lowStockCount * 2 + today.outOfStockCount * 3);
  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

  res.json({
    success: true,
    widgets: {
      todaySales: today.todaySales,
      todayProfit: today.todayProfit,
      todayExpenses: Number(expensesToday[0][0].total),
      todayTax: today.todayTax,
      todayOrders: today.todayOrders,
      pendingPayments: today.pendingPayments,
      lowStockCount: today.lowStockCount,
      outOfStockCount: today.outOfStockCount,
      businessHealthScore: healthScore,
      aiScore: Math.min(100, 60 + activeRecommendations[0][0].count * 2), // reflects how "watched" the business is
      unreadNotifications: unreadNotifications[0][0].count,
      activeRecommendations: activeRecommendations[0][0].count,
      inventoryValue: inventoryValue.costValue,
    },
  });
});

// GET /api/dashboard/charts — data for revenue/expense/profit/GST/inventory charts
const getCharts = asyncHandler(async (req, res) => {
  const businessId = req.user.businessId;
  const [revenueTrend, expenseBreakdown, gstChart, topProducts, cashFlow] = await Promise.all([
    analytics.getRevenueTrend(businessId, 30),
    analytics.getExpenseBreakdown(businessId, 30),
    analytics.getGstChart(businessId, 180),
    analytics.getTopProducts(businessId, 5),
    analytics.getCashFlow(businessId, 30),
  ]);

  res.json({
    success: true,
    charts: { revenueTrend, expenseBreakdown, gstChart, topProducts, cashFlow },
  });
});

// GET /api/dashboard/pl?from=&to=
const getProfitLoss = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const pl = await computeProfitAndLoss(req.user.businessId, { fromDate: from, toDate: to });
  res.json({ success: true, profitAndLoss: pl });
});

module.exports = { getSummary, getCharts, getProfitLoss };
