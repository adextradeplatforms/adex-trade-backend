import pool from '../config/database.js';

// Referral commission rates by level (%)
export const COMMISSION_RATES = {
  1: 8,
  2: 6,
  3: 4,
  4: 2,
  5: 1
};

export const DEPOSIT_BONUS_RATE = 3; // 3% for level 1 only

// Shared bonus credit handler (transaction-safe)
export const creditReferralBonus = async (
  client,
  referrerId,
  fromUserId,
  transactionId,
  level,
  rate,
  amount,
  type
) => {
  if (amount <= 0) return;

  // Update wallet
  await client.query(
    `UPDATE wallets
     SET balance = balance + $1,
         total_profit = total_profit + $1,
         updated_at = NOW()
     WHERE user_id = $2`,
    [amount, referrerId]
  );

  // Record commission
  await client.query(
    `INSERT INTO referral_commissions
     (user_id, from_user_id, transaction_id, level, commission_rate, commission_amount, type)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [referrerId, fromUserId, transactionId, level, rate, amount, type]
  );

  // Transaction log
  await client.query(
    `INSERT INTO transactions
     (user_id, type, amount, fee, net_amount, status, referral_user_id)
     VALUES ($1, 'referral_bonus', $2, 0, $2, 'completed', $3)`,
    [referrerId, amount, fromUserId]
  );
};

// Process referral bonuses on deposit
export const processDepositBonuses = async (client, userId, depositAmount, transactionId) => {
  try {
    const amount = Number(depositAmount);
    if (amount <= 0) return;

    // Get referrers
    const { rows: referrers } = await client.query(
      `SELECT user_id, level
       FROM referral_tree
       WHERE referred_user_id = $1
       ORDER BY level`,
      [userId]
    );

    if (!referrers.length) return;

    for (const { user_id: referrerId, level } of referrers) {
      const rate = COMMISSION_RATES[level];
      if (!rate) continue;

      // LEVEL COMMISSION
      const commission = (amount * rate) / 100;

      await creditReferralBonus(
        client,
        referrerId,
        userId,
        transactionId,
        level,
        rate,
        commission,
        'level_commission'
      );

      // DEPOSIT BONUS (LEVEL 1 ONLY)
      if (level === 1) {
        const depositBonus = (amount * DEPOSIT_BONUS_RATE) / 100;

        await creditReferralBonus(
          client,
          referrerId,
          userId,
          transactionId,
          level,
          DEPOSIT_BONUS_RATE,
          depositBonus,
          'deposit_bonus'
        );
      }
    }

    console.log(`✅ Referral bonuses processed for user ${userId}`);
  } catch (error) {
    console.error('Process deposit bonuses error:', error);
    throw error;
  }
};

// Referral earnings summary
export const getReferralEarningsSummary = async (userId) => {
  const result = await pool.query(
    `SELECT
       level,
       type,
       COUNT(*) AS count,
       COALESCE(SUM(commission_amount), 0) AS total_amount
     FROM referral_commissions
     WHERE user_id = $1
     GROUP BY level, type
     ORDER BY level, type`,
    [userId]
  );
  return result.rows;
};

// Top referrers leaderboard
export const getTopReferrers = async (limit = 10) => {
  const result = await pool.query(
    `SELECT
       u.id,
       u.email,
       u.full_name,
       COUNT(DISTINCT rt.referred_user_id) AS total_referrals,
       COALESCE(SUM(rc.commission_amount), 0) AS total_earnings
     FROM users u
     LEFT JOIN referral_tree rt ON u.id = rt.user_id
     LEFT JOIN referral_commissions rc ON u.id = rc.user_id
     WHERE u.is_admin = FALSE
     GROUP BY u.id
     HAVING COUNT(DISTINCT rt.referred_user_id) > 0
     ORDER BY total_earnings DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
};
