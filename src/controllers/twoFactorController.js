import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import pool from '../config/database.js';

/**
 * ===================== GENERATE 2FA =====================
 * Creates a temporary secret for the user and returns a QR code
 */
export const generateTwoFactor = async (req, res) => {
  try {
    // Generate a new 2FA secret
    const secret = speakeasy.generateSecret({
      length: 20,
      name: `AdexTrade (${req.user.email})`,
    });

    // Store temporary secret in database
    await pool.query(
      `UPDATE users SET twofa_temp_secret = $1 WHERE id = $2`,
      [secret.base32, req.user.id]
    );

    // Generate QR code for authenticator apps
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      data: {
        secret: secret.base32, // Optional: You can hide this in production
        qrCode,
      },
    });
  } catch (error) {
    console.error('Generate 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate 2FA',
    });
  }
};

/**
 * ===================== ENABLE 2FA =====================
 * Verifies OTP and permanently enables 2FA for the user
 */
export const enableTwoFactor = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: '2FA token is required',
      });
    }

    // Get temporary secret from database
    const { rows } = await pool.query(
      `SELECT twofa_temp_secret FROM users WHERE id = $1`,
      [req.user.id]
    );
    const tempSecret = rows[0]?.twofa_temp_secret;

    if (!tempSecret) {
      return res.status(400).json({
        success: false,
        message: 'No 2FA setup found',
      });
    }

    // Verify the OTP
    const verified = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token,
      window: 1, // Allow 1-step clock drift
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 2FA code',
      });
    }

    // Save the secret permanently and enable 2FA
    await pool.query(
      `UPDATE users 
       SET twofa_secret = $1, twofa_enabled = TRUE, twofa_temp_secret = NULL
       WHERE id = $2`,
      [tempSecret, req.user.id]
    );

    res.json({
      success: true,
      message: 'Two-factor authentication enabled',
    });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enable 2FA',
    });
  }
};

/**
 * ===================== DISABLE 2FA =====================
 * Disables 2FA for the user
 */
export const disableTwoFactor = async (req, res) => {
  try {
    await pool.query(
      `UPDATE users 
       SET twofa_secret = NULL, twofa_enabled = FALSE, twofa_temp_secret = NULL
       WHERE id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'Two-factor authentication disabled',
    });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable 2FA',
    });
  }
};
/**
 * ===================== VERIFY 2FA =====================
 * Verifies OTP during login
 */
export const verifyTwoFactor = async (userId, token) => {
  const { rows } = await pool.query(
    `SELECT twofa_secret, twofa_enabled FROM users WHERE id = $1`,
    [userId]
  );

  const user = rows[0];

  if (!user || !user.twofa_enabled) {
    return true; // 2FA not enabled → allow login
  }

  if (!token) {
    return false; // Token required but not provided
  }

  return speakeasy.totp.verify({
    secret: user.twofa_secret,
    encoding: 'base32',
    token,
    window: 1,
  });
};
