const { pool } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const asyncHandler = require('../utils/asyncHandler');
const { signAccessToken } = require('../utils/jwt');

// POST /api/business/register — first-time business + employees setup
const registerBusiness = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const {
    businessName, ownerName, gstNumber, panNumber, businessType, industry, storeCategory,
    address, city, state, country, pincode,
    initialInvestment, workingCapital, monthlyRent, electricityCost, internetCost, otherExpenses,
    gstRegistered, currency, financialYear, taxRegime,
    employees, // [{ name, position, monthlySalary }]
  } = req.body;

  if (!businessName || !ownerName) throw new AppError('Business name and owner name are required', 400);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [bizResult] = await conn.query(
      `INSERT INTO businesses (
        owner_user_id, business_name, owner_name, gst_number, pan_number, business_type, industry,
        store_category, address, city, state, country, pincode,
        initial_investment, working_capital, monthly_rent, electricity_cost, internet_cost, other_expenses,
        gst_registered, currency, financial_year, tax_regime, onboarding_complete
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
      [
        userId, businessName, ownerName, gstNumber || null, panNumber || null, businessType || null, industry || null,
        storeCategory || null, address || null, city || null, state || null, country || 'India', pincode || null,
        initialInvestment || 0, workingCapital || 0, monthlyRent || 0, electricityCost || 0, internetCost || 0, otherExpenses || 0,
        gstRegistered ? 1 : 0, currency || 'INR', financialYear || null, taxRegime || 'new',
      ]
    );
    const businessId = bizResult.insertId;

    await conn.query('UPDATE users SET business_id = ? WHERE id = ?', [businessId, userId]);

    if (Array.isArray(employees) && employees.length > 0) {
      const values = employees
        .filter((e) => e.name)
        .map((e) => [businessId, e.name, e.position || null, e.monthlySalary || 0]);
      if (values.length > 0) {
        await conn.query('INSERT INTO employees (business_id, name, position, monthly_salary) VALUES ?', [values]);
      }
    }

    // Seed recurring monthly expenses from the setup form so P&L reflects them immediately
    const recurring = [
      ['rent', 'Monthly rent', monthlyRent],
      ['electricity', 'Electricity', electricityCost],
      ['internet', 'Internet', internetCost],
      ['misc', 'Other expenses', otherExpenses],
    ].filter(([, , amt]) => amt && Number(amt) > 0);

    for (const [category, description, amount] of recurring) {
      await conn.query(
        'INSERT INTO expenses (business_id, category, description, amount, expense_date) VALUES (?,?,?,?,CURDATE())',
        [businessId, category, description, amount]
      );
    }

    await conn.commit();

    const accessToken = signAccessToken({ userId, businessId, role: 'owner', email: req.user.email });

    res.status(201).json({
      success: true,
      message: 'Business registered successfully',
      accessToken,
      business: { id: businessId, businessName },
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// GET /api/business/settings
const getSettings = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM businesses WHERE id = ?', [req.user.businessId]);
  if (rows.length === 0) throw new AppError('Business not found', 404);
  res.json({ success: true, business: rows[0] });
});

// PUT /api/business/settings
const updateSettings = asyncHandler(async (req, res) => {
  const allowedFields = [
    'business_name', 'owner_name', 'gst_number', 'pan_number', 'business_type', 'industry',
    'store_category', 'address', 'city', 'state', 'country', 'pincode',
    'monthly_rent', 'electricity_cost', 'internet_cost', 'other_expenses',
    'gst_registered', 'currency', 'financial_year', 'tax_regime', 'theme', 'language',
  ];
  const updates = [];
  const values = [];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }
  if (updates.length === 0) throw new AppError('No valid fields to update', 400);

  values.push(req.user.businessId);
  await pool.query(`UPDATE businesses SET ${updates.join(', ')} WHERE id = ?`, values);
  res.json({ success: true, message: 'Settings updated' });
});

module.exports = { registerBusiness, getSettings, updateSettings };
