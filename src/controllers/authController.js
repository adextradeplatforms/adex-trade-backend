// src/controllers/authController.js
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import jwt from 'jsonwebtoken';
import { sendSuccess, sendError, sendValidationError } from '../utils/responseHelper.js';
import {
  generateAccessToken,
  generateRefreshToken,
  generateVerificationToken
} from '../utils/generateToken.js';
import { validateEmail, validatePassword, generateReferralCode } from '../utils/validators.js';
import { sendVerificationEmail, sendWelcomeEmail } from '../services/emailService.js';
import { verifyTwoFactor } from './twoFactorController.js';

/* ============================
   REGISTER
============================ */
export const register = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { email, password, fullName, phone, referralCode, language } = req.body;

    // Validation
    if (!email || !password || !fullName) {
      return sendValidationError(res, 'Full name, email, and password are required');
    }
    if (!validateEmail(email)) return sendValidationError(res, 'Invalid email format');
    if (!validatePassword(password)) return sendValidationError(res, 'Password must be at least 6 characters');

    // Check existing user
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) return sendError(res, 'Email already registered', 400);

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate unique referral code
    let userReferralCode;
    let isUnique = false;
    while (!isUnique) {
      userReferralCode = generateReferralCode();
      const codeCheck = await client.query('SELECT id FROM users WHERE referral_code = $1', [userReferralCode]);
      if (codeCheck.rows.length === 0) isUnique = true;
    }

    // Generate email verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Referral handling
    let referrerId = null;
    if (referralCode) {
      const referrerResult = await client.query('SELECT id FROM users WHERE referral_code = $1', [referralCode]);
      if (referrerResult.rows.length > 0) referrerId = referrerResult.rows[0].id;
    }

    // Insert user
    const userResult = await client.query(
      `INSERT INTO users
        (email, password_hash, full_name, phone, referral_code, referred_by, verification_token, verification_expires, preferred_language)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING id, email, full_name, referral_code, preferred_language`,
      [email.toLowerCase(), passwordHash, fullName, phone || null, userReferralCode, referrerId, verificationToken, verificationExpires, language || 'en']
    );

    const user = userResult.rows[0];

    // Create wallet
    await client.query('INSERT INTO wallets (user_id) VALUES ($1)', [user.id]);

    // Build referral tree
    if (referrerId) await buildReferralTree(client, user.id, referrerId);

    await client.query('COMMIT');

    // Send verification email (optional failure)
    try {
      await sendVerificationEmail(email, verificationToken, language || 'en');
    } catch (err) {
      console.error('Verification email error:', err.message);
    }

    return sendSuccess(res, 'Registration successful. Please verify your email.', {
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      referralCode: user.referral_code,
      language: user.preferred_language
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Register error:', error);
    return sendError(res, 'Registration failed');
  } finally {
    client.release();
  }
};

/* ============================
   REFERRAL TREE
============================ */
const buildReferralTree = async (client, newUserId, directReferrerId) => {
  await client.query(
    'INSERT INTO referral_tree (user_id, referred_user_id, level) VALUES ($1,$2,1)',
    [directReferrerId, newUserId]
  );

  const uplines = await client.query(
    `SELECT user_id, level FROM referral_tree
     WHERE referred_user_id = $1 AND level < 5`,
    [directReferrerId]
  );

  for (const row of uplines.rows) {
    const nextLevel = row.level + 1;
    if (nextLevel <= 5) {
      await client.query(
        'INSERT INTO referral_tree (user_id, referred_user_id, level) VALUES ($1,$2,$3)',
        [row.user_id, newUserId, nextLevel]
      );
    }
  }
};

/* ============================
   LOGIN
============================ */
export const login = async (req, res) => {
  try {
    const { email, password, twoFactorToken } = req.body;
    if (!email || !password) return sendValidationError(res, 'Email and password are required');

    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userResult.rows.length === 0) return sendError(res, 'Invalid email or password', 401);

    const user = userResult.rows[0];

    if (!user.is_active) return sendError(res, 'Account deactivated', 403);

    // Temporarily ignore email verification
    // if (!user.email_verified) return sendError(res, 'Please verify your email before logging in', 403);

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) return sendError(res, 'Invalid email or password', 401);

    // 2FA
    if (user.two_factor_enabled) {
      if (!twoFactorToken) {
        return res.status(400).json({
          success: false,
          message: 'Two-factor token required',
          twoFactorRequired: true
        });
      }

      const twoFactorVerification = await verifyTwoFactor(user.id, twoFactorToken);
      if (!twoFactorVerification.valid) return sendError(res, 'Invalid two-factor token', 401);
    }

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    return sendSuccess(res, 'Login successful', {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        emailVerified: user.email_verified,
        referralCode: user.referral_code,
        isAdmin: user.is_admin,
        twoFactorEnabled: user.two_factor_enabled
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    return sendError(res, 'Server error');
  }
};

/* ============================
   VERIFY EMAIL
============================ */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return sendError(res, 'Verification token required', 400);

    const result = await pool.query(
      'SELECT id, email, full_name, verification_expires, email_verified FROM users WHERE verification_token = $1',
      [token]
    );

    if (result.rows.length === 0) return sendError(res, 'Invalid token', 400);

    const user = result.rows[0];

    if (user.email_verified) return sendError(res, 'Email already verified', 400);

    if (new Date() > new Date(user.verification_expires)) return sendError(res, 'Token expired', 400);

    await pool.query(
      'UPDATE users SET email_verified = TRUE, verification_token = NULL, verification_expires = NULL WHERE id = $1',
      [user.id]
    );

    try {
      await sendWelcomeEmail(user.email, user.full_name);
    } catch (err) {
      console.error('Welcome email error:', err.message);
    }

    return sendSuccess(res, 'Email verified successfully');
  } catch (error) {
    console.error('Verify email error:', error);
    return sendError(res, 'Verification failed');
  }
};

/* ============================
   RESEND VERIFICATION
============================ */
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return sendValidationError(res, 'Email required');

    const result = await pool.query(
      'SELECT id, email, full_name, email_verified, verification_token, verification_expires, preferred_language FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) return sendError(res, 'User not found', 404);

    const user = result.rows[0];
    if (user.email_verified) return sendError(res, 'Email already verified', 400);

    let token = user.verification_token;
    if (!token || new Date() > new Date(user.verification_expires)) {
      token = generateVerificationToken();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await pool.query(
        'UPDATE users SET verification_token = $1, verification_expires = $2 WHERE id = $3',
        [token, expires, user.id]
      );
    }

    try {
      await sendVerificationEmail(user.email, token, user.preferred_language || 'en');
    } catch (err) {
      console.error('Resend verification error:', err.message);
    }

    return sendSuccess(res, 'Verification email sent');
  } catch (error) {
    console.error('Resend verification error:', error);
    return sendError(res, 'Failed to resend verification email');
  }
};

/* ============================
   REFRESH TOKEN
============================ */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return sendValidationError(res, 'Refresh token required');

    jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) return sendError(res, 'Invalid refresh token', 403);

      const newAccessToken = generateAccessToken(decoded.userId);
      return sendSuccess(res, 'Token refreshed', { accessToken: newAccessToken });
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return sendError(res, 'Token refresh failed');
  }
};

/* ============================
   GET PROFILE
============================ */
export const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.phone, u.referral_code,
        u.email_verified, u.created_at,
        w.balance, w.invested_amount, w.total_profit, w.total_referral_bonus
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) return sendError(res, 'User not found', 404);

    return sendSuccess(res, result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    return sendError(res, 'Failed to fetch profile');
  }
};
