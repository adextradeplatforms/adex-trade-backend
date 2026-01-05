import pool from '../config/database.js';
import User from '../models/User.js';

// Get referral statistics
export const getReferralStats = async (req, res) => {
  try {
    const stats = await User.getReferralStats(req.user.id);

    const earningsResult = await pool.query(
      `SELECT 
         COALESCE(SUM(commission_amount), 0) AS total_earnings,
         COUNT(*) AS total_commissions
       FROM referral_commissions
       WHERE user_id = $1`,
      [req.user.id]
    );

    const earnings = earningsResult.rows[0];

    res.json({
      success: true,
      data: {
        referral_counts: stats,
        total_earnings: Number(earnings.total_earnings),
        total_commissions: Number(earnings.total_commissions)
      }
    });

  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referral statistics'
    });
  }
};

// Get referral tree
export const getReferralTree = async (req, res) => {
  try {
    const { level } = req.query;

    const referrals = await User.getReferrals(
      req.user.id,
      level ? Number(level) : null
    );

    const referralIds = referrals.map(r => r.id);

    if (referralIds.length) {
      const detailsResult = await pool.query(
        `SELECT 
           u.id,
           COALESCE(w.invested_amount, 0) AS invested_amount,
           COALESCE(w.total_profit, 0) AS total_profit,
           (
             SELECT COUNT(*) 
             FROM user_investments 
             WHERE user_id = u.id AND status = 'active'
           ) AS active_investments
         FROM users u
         LEFT JOIN wallets w ON u.id = w.user_id
         WHERE u.id = ANY($1)`,
        [referralIds]
      );

      const detailsMap = Object.fromEntries(
        detailsResult.rows.map(row => [row.id, row])
      );

      referrals.forEach(ref => {
        const d = detailsMap[ref.id];
        if (d) {
          ref.invested_amount = d.invested_amount;
          ref.total_profit = d.total_profit;
          ref.active_investments = Number(d.active_investments);
        }
      });
    }

    res.json({
      success: true,
      data: referrals
    });

  } catch (error) {
    console.error('Get referral tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referral tree'
    });
  }
};

// Get referral earnings
export const getReferralEarnings = async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);

    const earningsResult = await pool.query(
      `SELECT 
         rc.*,
         u.email AS from_user_email,
         u.full_name AS from_user_name
       FROM referral_commissions rc
       LEFT JOIN users u ON rc.from_user_id = u.id
       WHERE rc.user_id = $1
       ORDER BY rc.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM referral_commissions WHERE user_id = $1',
      [req.user.id]
    );

    const levelResult = await pool.query(
      `SELECT 
         level,
         COUNT(*) AS count,
         COALESCE(SUM(commission_amount), 0) AS total_amount
       FROM referral_commissions
       WHERE user_id = $1
       GROUP BY level
       ORDER BY level`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        earnings: earningsResult.rows,
        total: Number(countResult.rows[0].count),
        by_level: levelResult.rows,
        limit,
        offset
      }
    });

  } catch (error) {
    console.error('Get referral earnings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referral earnings'
    });
  }
};
