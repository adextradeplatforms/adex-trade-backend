import pool from '../config/database.js';

class Wallet {
  static async getByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );
    return result.rows[0];
  }

  static async updateBalance(userId, amount, type = 'add') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const operator = type === 'add' ? '+' : '-';
      const result = await client.query(
        `UPDATE wallets 
         SET balance = balance ${operator} $1,
             updated_at = NOW()
         WHERE user_id = $2
         RETURNING *`,
        [Math.abs(amount), userId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async addProfit(userId, profitAmount) {
    const result = await pool.query(
      `UPDATE wallets 
       SET balance = balance + $1,
           total_profit = total_profit + $1,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [profitAmount, userId]
    );
    return result.rows[0];
  }

  static async addReferralBonus(userId, bonusAmount) {
    const result = await pool.query(
      `UPDATE wallets 
       SET balance = balance + $1,
           total_referral_bonus = total_referral_bonus + $1,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [bonusAmount, userId]
    );
    return result.rows[0];
  }

  static async addInvestment(userId, amount) {
    const result = await pool.query(
      `UPDATE wallets 
       SET balance = balance - $1,
           invested_amount = invested_amount + $1,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [amount, userId]
    );
    return result.rows[0];
  }

  static async returnInvestment(userId, amount) {
    const result = await pool.query(
      `UPDATE wallets 
       SET balance = balance + $1,
           invested_amount = invested_amount - $1,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [amount, userId]
    );
    return result.rows[0];
  }

  static async getTransactionHistory(userId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }
}

export default Wallet;
