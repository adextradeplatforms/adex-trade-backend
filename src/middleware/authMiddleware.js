// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

/**
 * Middleware to authenticate JWT access token
 */
export const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1]; // Expect "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // Fetch user from database
    const userResult = await pool.query(
      `SELECT id, email, full_name, is_active, email_verified, is_admin, two_factor_enabled
       FROM users
       WHERE id = $1`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = userResult.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Contact support.',
      });
    }

    // Attach user to request for later middleware/controllers
    req.user = user;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Middleware to ensure the user has verified their email
 */
export const requireEmailVerification = (req, res, next) => {
  if (!req.user?.email_verified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email address first',
    });
  }
  next();
};

/**
 * Middleware to ensure the user is an admin
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({
      success: false,
      message: 'Admin privileges required',
    });
  }
  next();
};
