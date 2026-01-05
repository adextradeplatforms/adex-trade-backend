import pool from '../config/database.js';

class Investment {
  static async getAllPlans() {
    const result = await pool.query(
      'SELECT * FROM investment_plans WHERE is_active = TRUE ORDER BY min_investment'
    );
    return result.rows;
  }

  static async getPlanById(planId) {
    const result = await pool.query(
      'SELECT * FROM investment_plans WHERE id = $1',
      [planId]
    );
    return result.rows[0];
  }

  static async createUserInvestment(userId, planId, amount) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get plan details
      const planResult = await client.query(
        'SELECT * FROM investment_plans WHERE id = $1',
        [planId]
      );

      if (planResult.rows.length === 0) {
        throw new Error('Investment plan not found');
      }

      const plan = planResult.rows[0];

      // Create investment
      const investmentResult = await client.query(
        `INSERT INTO user_investments 
         (user_id, plan_id, invested_amount, daily_profit_rate, last_profit_calculation)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [userId, planId, amount, plan.daily_profit_rate]
      );

      await client.query('COMMIT');
      return investmentResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getUserInvestments(userId, status = 'active') {
    const result = await pool.query(
      `SELECT ui.*, ip.name as plan_name
       FROM user_investments ui
       JOIN investment_plans ip ON ui.plan_id = ip.id
       WHERE ui.user_id = $1 AND ui.status = $2
       ORDER BY ui.created_at DESC`,
      [userId, status]
    );
    return result.rows;
  }

  static async getInvestmentById(investmentId) {
    const result = await pool.query(
      `SELECT ui.*, ip.name as plan_name
       FROM user_investments ui
       JOIN investment_plans ip ON ui.plan_id = ip.id
       WHERE ui.id = $1`,
      [investmentId]
    );
    return result.rows[0];
  }

  static async stopInvestment(investmentId) {
    const result = await pool.query(
      `UPDATE user_investments 
       SET status = 'stopped', stopped_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [investmentId]
    );
    return result.rows[0];
  }

  static async getAllActiveInvestments() {
    const result = await pool.query(
      `SELECT * FROM user_investments 
       WHERE status = 'active'`
    );
    return result.rows;
  }

  static async updateLastProfitCalculation(investmentId) {
    const result = await pool.query(
      `UPDATE user_investments 
       SET last_profit_calculation = NOW()
       WHERE id = $1
       RETURNING *`,
      [investmentId]
    );
    return result.rows[0];
  }

  static async addProfit(investmentId, profitAmount) {
    const result = await pool.query(
      `UPDATE user_investments 
       SET total_profit_earned = total_profit_earned + $1
       WHERE id = $2
       RETURNING *`,
      [profitAmount, investmentId]
    );
    return result.rows[0];
  }
}

export default Investment;
