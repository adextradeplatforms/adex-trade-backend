import pool from '../config/database.js';

/**
 * Middleware to set language based on user preference
 * Falls back to Accept-Language header or default 'en'
 */
const setUserLanguage = async (req, res, next) => {
  try {
    // If user is authenticated, get their preferred language
    if (req.user?.id) {
      const result = await pool.query(
        'SELECT preferred_language FROM users WHERE id = $1',
        [req.user.id]
      );

      if (result.rows.length > 0 && result.rows[0].preferred_language) {
        req.i18n.changeLanguage(result.rows[0].preferred_language);
      }
    }

    next();
  } catch (error) {
    // If anything fails, continue with default language
    next();
  }
};

export default setUserLanguage;
