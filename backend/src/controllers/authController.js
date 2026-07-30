const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { AppError } = require('../middleware/errorHandler');
const asyncHandler = require('../utils/asyncHandler');

const SALT_ROUNDS = 12;

// POST /api/auth/register  — creates the login account only; business details come next
const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password are required', 400);
  if (password.length < 8) throw new AppError('Password must be at least 8 characters', 400);

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) throw new AppError('An account with this email already exists', 409);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [result] = await pool.query(
    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
    [email, passwordHash, 'owner']
  );

  const accessToken = signAccessToken({ userId: result.insertId, businessId: null, role: 'owner', email });
  const refreshToken = signRefreshToken({ userId: result.insertId });

  res.status(201).json({
    success: true,
    message: 'Account created. Please complete your business registration.',
    accessToken,
    refreshToken,
    user: { id: result.insertId, email, role: 'owner', businessId: null, onboardingComplete: false },
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password are required', 400);

  const [rows] = await pool.query(
    `SELECT u.id, u.email, u.password_hash, u.role, u.business_id, u.is_active,
            b.onboarding_complete, b.business_name
     FROM users u LEFT JOIN businesses b ON b.id = u.business_id
     WHERE u.email = ?`,
    [email]
  );
  const user = rows[0];
  if (!user || !user.is_active) throw new AppError('Invalid email or password', 401);

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AppError('Invalid email or password', 401);

  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

  const accessToken = signAccessToken({
    userId: user.id,
    businessId: user.business_id,
    role: user.role,
    email: user.email,
  });
  const refreshToken = signRefreshToken({ userId: user.id });

  res.json({
    success: true,
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      businessId: user.business_id,
      businessName: user.business_name,
      onboardingComplete: !!user.onboarding_complete,
    },
  });
});

// POST /api/auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError('Refresh token required', 400);

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const [rows] = await pool.query(
    'SELECT id, email, role, business_id FROM users WHERE id = ? AND is_active = 1',
    [decoded.userId]
  );
  const user = rows[0];
  if (!user) throw new AppError('User not found', 401);

  const accessToken = signAccessToken({
    userId: user.id,
    businessId: user.business_id,
    role: user.role,
    email: user.email,
  });

  res.json({ success: true, accessToken });
});

// POST /api/auth/forgot-password — issues a reset token (email delivery stubbed; see notificationService)
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new AppError('Email is required', 400);

  const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  // Always respond success to avoid leaking which emails are registered
  if (rows.length === 0) {
    return res.json({ success: true, message: 'If that account exists, a reset link has been sent.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  // In production: store hashed token + expiry in a password_resets table, email the link.
  // Kept minimal here since SMTP credentials are environment-specific.
  res.json({
    success: true,
    message: 'If that account exists, a reset link has been sent.',
    devOnlyResetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
  });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.email, u.role, u.business_id, b.business_name, b.onboarding_complete
     FROM users u LEFT JOIN businesses b ON b.id = u.business_id WHERE u.id = ?`,
    [req.user.userId]
  );
  const user = rows[0];
  if (!user) throw new AppError('User not found', 404);
  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      businessId: user.business_id,
      businessName: user.business_name,
      onboardingComplete: !!user.onboarding_complete,
    },
  });
});

module.exports = { register, login, refresh, forgotPassword, me };
