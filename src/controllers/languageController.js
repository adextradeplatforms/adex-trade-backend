// src/controllers/languageController.js
import pool from '../config/database.js';
import logger from '../config/logger.js';

// ===================== GET AVAILABLE LANGUAGES =====================
export const getLanguages = async (req, res) => {
  try {
    const languages = [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский' }
    ];

    res.json({
      success: true,
      data: languages
    });
  } catch (error) {
    logger.error('Get languages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch languages'
    });
  }
};

// ===================== UPDATE USER LANGUAGE =====================
export const updateLanguage = async (req, res) => {
  try {
    const { language } = req.body;
    const supportedLanguages = ['en', 'ar', 'es', 'it', 'ru'];

    if (!language || !supportedLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid language code'
      });
    }

    await pool.query(
      'UPDATE users SET preferred_language = $1 WHERE id = $2',
      [language, req.user.id]
    );

    logger.info('User language updated', { userId: req.user.id, language });

    res.json({
      success: true,
      message: 'Language preference updated successfully',
      data: { language }
    });
  } catch (error) {
    logger.error('Update language error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update language preference'
    });
  }
};

// ===================== GET USER LANGUAGE =====================
export const getUserLanguage = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT preferred_language FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        language: result.rows[0].preferred_language || 'en'
      }
    });
  } catch (error) {
    logger.error('Get user language error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch language preference'
    });
  }
};
