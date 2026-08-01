const { pool } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const asyncHandler = require('../utils/asyncHandler');
const { groqChat, buildBusinessContextPrompt } = require('../services/groqService');
const { computeProfitAndLoss } = require('../services/plService');
const analytics = require('../services/analyticsService');
const { generateRecommendations } = require('../services/recommendationService');

/**
 * Assembles a compact, current snapshot of the business to ground the chatbot.
 * Kept intentionally summarized (not raw row dumps) to control token usage.
 */
async function buildContextSnapshot(businessId) {
  const [[business]] = await pool.query('SELECT business_name, industry, gst_registered, currency FROM businesses WHERE id = ?', [businessId]);
  const pl = await computeProfitAndLoss(businessId);
  const month = await analytics.getRevenueForPeriod(businessId, 'monthly');
  const week = await analytics.getRevenueForPeriod(businessId, 'weekly');
  const topProducts = await analytics.getTopProducts(businessId, 5);
  const inventory = await analytics.getInventoryValue(businessId);
  const cashFlow = await analytics.getCashFlow(businessId, 30);

  const [lowStock] = await pool.query(
    `SELECT name, quantity, reorder_level FROM products WHERE business_id = ? AND is_active = 1 AND quantity <= reorder_level LIMIT 10`,
    [businessId]
  );
  const [topCustomers] = await pool.query(
    `SELECT c.name, COALESCE(SUM(i.grand_total),0) AS total_spent
     FROM customers c JOIN invoices i ON i.customer_id = c.id
     WHERE c.business_id = ? GROUP BY c.id, c.name ORDER BY total_spent DESC LIMIT 5`,
    [businessId]
  );
  const [suppliers] = await pool.query(
    `SELECT name, avg_delivery_delay_days FROM suppliers WHERE business_id = ? ORDER BY avg_delivery_delay_days DESC LIMIT 5`,
    [businessId]
  );
  const [[payroll]] = await pool.query(
    `SELECT COALESCE(SUM(monthly_salary),0) AS total, COUNT(*) AS headcount FROM employees WHERE business_id = ? AND is_active = 1`,
    [businessId]
  );

  return {
    businessName: business?.business_name,
    industry: business?.industry,
    currency: business?.currency || 'INR',
    profitAndLoss: pl,
    revenueThisMonth: month,
    revenueThisWeek: week,
    topProductsByProfit: topProducts,
    lowStockProducts: lowStock,
    inventory,
    cashFlowLast30Days: cashFlow,
    topCustomers,
    supplierDelays: suppliers,
    payroll: { totalMonthlySalary: Number(payroll.total), headcount: Number(payroll.headcount) },
  };
}

// POST /api/ai/chat  body: { message }
const chat = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message) throw new AppError('Message is required', 400);

  const businessId = req.user.businessId;
  const context = await buildContextSnapshot(businessId);
  const systemPrompt = buildBusinessContextPrompt(context);

  // Pull last 10 messages for short-term conversational memory
  const [history] = await pool.query(
    `SELECT role, content FROM ai_chat_messages WHERE business_id = ? ORDER BY id DESC LIMIT 10`,
    [businessId]
  );
  const messages = [...history.reverse().map((h) => ({ role: h.role, content: h.content })), { role: 'user', content: message }];

  await pool.query('INSERT INTO ai_chat_messages (business_id, user_id, role, content) VALUES (?,?,?,?)', [
    businessId, req.user.userId, 'user', message,
  ]);

  const reply = await groqChat({ systemPrompt, messages });

  await pool.query('INSERT INTO ai_chat_messages (business_id, user_id, role, content) VALUES (?,?,?,?)', [
    businessId, req.user.userId, 'assistant', reply,
  ]);

  res.json({ success: true, reply });
});

// GET /api/ai/chat/history
const chatHistory = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT role, content, created_at FROM ai_chat_messages WHERE business_id = ? ORDER BY id ASC LIMIT 100`,
    [req.user.businessId]
  );
  res.json({ success: true, history: rows });
});

// GET /api/ai/recommendations — returns stored + freshly generated rule-based recommendations
const getRecommendations = asyncHandler(async (req, res) => {
  await generateRecommendations(req.user.businessId);
  const [rows] = await pool.query(
    `SELECT * FROM ai_recommendations WHERE business_id = ? AND is_dismissed = 0 ORDER BY created_at DESC LIMIT 20`,
    [req.user.businessId]
  );
  res.json({ success: true, recommendations: rows });
});

// PUT /api/ai/recommendations/:id/dismiss
const dismissRecommendation = asyncHandler(async (req, res) => {
  await pool.query('UPDATE ai_recommendations SET is_dismissed = 1 WHERE id = ? AND business_id = ?', [
    req.params.id, req.user.businessId,
  ]);
  res.json({ success: true });
});

// GET /api/ai/investment-advice — educational, rule-based low-risk investment suggestions
const getInvestmentAdvice = asyncHandler(async (req, res) => {
  const pl = await computeProfitAndLoss(req.user.businessId);
  const excessProfit = Math.max(0, pl.netBusinessProfit);

  const options = [
    { name: 'Fixed Deposit', risk: 'Very Low', expectedReturns: '6.5% – 7.5% p.a.', liquidity: 'Low (penalty on early withdrawal)', period: '6 months – 5 years' },
    { name: 'Government Bonds', risk: 'Very Low', expectedReturns: '7% – 7.8% p.a.', liquidity: 'Low', period: '5 – 40 years' },
    { name: 'Treasury Bills', risk: 'Very Low', expectedReturns: '6.5% – 7% p.a.', liquidity: 'Medium', period: '91 – 364 days' },
    { name: 'Liquid Mutual Funds', risk: 'Low', expectedReturns: '6% – 7% p.a.', liquidity: 'High (redeem in 1 day)', period: 'No fixed term' },
    { name: 'Index Funds', risk: 'Medium', expectedReturns: '10% – 12% p.a. (historical, market-linked)', liquidity: 'High', period: '3+ years recommended' },
    { name: 'High Interest Savings Account', risk: 'Very Low', expectedReturns: '3.5% – 6% p.a.', liquidity: 'Very High', period: 'None' },
    { name: 'Corporate Bonds (AAA-rated)', risk: 'Low – Medium', expectedReturns: '8% – 9.5% p.a.', liquidity: 'Medium', period: '1 – 10 years' },
  ];

  res.json({
    success: true,
    excessMonthlyProfit: excessProfit,
    note: 'This is general educational information, not personalized financial advice. Please consult a qualified financial advisor before investing.',
    options,
  });
});

module.exports = { chat, chatHistory, getRecommendations, dismissRecommendation, getInvestmentAdvice };
