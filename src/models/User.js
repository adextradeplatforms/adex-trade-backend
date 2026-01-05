import pool from '../config/database.js';

class User {
  static async findById(userId) {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return result.rows[0];
  }

  static async findByReferralCode(referralCode) {
    const result = await pool.query(
      'SELECT id, email, full_name, referral_code FROM users WHERE referral_code = $1',
      [referralCode]
    );
    return result.rows[0];
  }

  static async updateProfile(userId, data) {
    const { fullName, phone } = data;
    const result = await pool.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, full_name, phone`,
      [fullName, phone, userId]
    );
    return result.rows[0];
  }

  static async getReferrals(userId, level = null) {
    let query = `
      SELECT u.id, u.email, u.full_name, u.created_at, rt.level
      FROM referral_tree rt
      JOIN users u ON rt.referred_user_id = u.id
      WHERE rt.user_id = $1
    `;
    const params = [userId];

    if (level) {
      query += ' AND rt.level = $2';
      params.push(level);
    }

    query += ' ORDER BY rt.level, u.created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getReferralStats(userId) {
    const result = await pool.query(
      `SELECT 
         COUNT(*) AS total_referrals,
         COUNT(CASE WHEN level = 1 THEN 1 END) AS level_1,
         COUNT(CASE WHEN level = 2 THEN 1 END) AS level_2,
         COUNT(CASE WHEN level = 3 THEN 1 END) AS level_3,
         COUNT(CASE WHEN level = 4 THEN 1 END) AS level_4,
         COUNT(CASE WHEN level = 5 THEN 1 END) AS level_5
       FROM referral_tree
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }
}

export default User;
