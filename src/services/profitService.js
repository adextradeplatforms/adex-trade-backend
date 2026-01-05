import pool from '../config/database.js';
import Investment from '../models/Investment.js';

/**
 * Calculate profit for a single investment
 * @param {object} client - PostgreSQL client (transaction-safe)
 * @param {object} investment - Investment record
 * @returns {object|null} profit info or null if no profit
 */
export const calculateProfit = async (client, investment) => {
  try {
    const now = new Date();
    const lastCalculation = new Date(
      investment.last_profit_calculation || investment.started_at
    );

    // Hours elapsed since last calculation
    const hoursElapsed = (now - lastCalculation) / (1000 * 60 * 60);
    if (hoursElapsed < 0.01) return null; // too soon to calculate

    const dailyRate = Number(investment.daily_profit_rate) / 100;
    const investedAmount = Number(investment.invested_amount);
    if (dailyRate <= 0 || investedAmount <= 0) return null;

    // Profit formula (pro-rata daily)
    const profit = (investedAmount * dailyRate * hoursElapsed) / 24;
    if (profit <= 0) return null;

    // Update wallet
    await client.query(
      `UPDATE wallets
       SET balance = balance + $1,
           total_profit = total_profit + $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [profit, investment.user_id]
    );

    // Update investment record
    await client.query(
      `UPDATE user_investments
       SET total_profit_earned = total_profit_earned + $1,
           last_profit_calculation = NOW()
       WHERE id = $2`,
      [profit, investment.id]
    );

    // Create profit transaction
    await client.query(
      `INSERT INTO transactions
       (user_id, type, amount, fee, net_amount, status, investment_id)
       VALUES ($1, 'profit', $2, 0, $2, 'completed', $3)`,
      [investment.user_id, profit, investment.id]
    );

    // Log calculation
    await client.query(
      `INSERT INTO profit_calculations
       (investment_id, user_id, calculated_profit, calculation_start, calculation_end, hours_elapsed)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [investment.id, investment.user_id, profit, lastCalculation, now, hoursElapsed]
    );

    return {
      investmentId: investment.id,
      userId: investment.user_id,
      profit,
      hoursElapsed
    };
  } catch (error) {
    console.error('Calculate profit error:', error);
    throw error;
  }
};

/**
 * Calculate profits for all active investments
 */
export const calculateAllProfits = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const investments = await Investment.getAllActiveInvestments();
    console.log(`📊 Processing ${investments.length} active investments`);

    const results = [];
    for (const investment of investments) {
      try {
        const result = await calculateProfit(client, investment);
        if (result) results.push(result);
      } catch (err) {
        console.error(`❌ Investment ${investment.id} failed`, err);
      }
    }

    await client.query('COMMIT');

    const totalProfit = results.reduce((sum, r) => sum + Number(r.profit), 0);
    console.log(`✅ Profit calculation complete`);
    console.log(`• Processed: ${results.length}`);
    console.log(`• Total Profit: ${totalProfit.toFixed(6)} USDT`);

    return {
      success: true,
      processed: results.length,
      totalProfit
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Calculate all profits error:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get user profit history
 * @param {number} userId
 * @param {number} limit
 */
export const getUserProfitHistory = async (userId, limit = 50) => {
  try {
    const result = await pool.query(
      `SELECT pc.*, ip.name AS plan_name
       FROM profit_calculations pc
       JOIN user_investments ui ON pc.investment_id = ui.id
       JOIN investment_plans ip ON ui.plan_id = ip.id
       WHERE pc.user_id = $1
       ORDER BY pc.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Get profit history error:', error);
    throw error;
  }
};
