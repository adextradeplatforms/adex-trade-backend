// src/controllers/adminController.js
import pool from '../config/database.js';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import blockchainService from '../services/blockchainService.js';
import { sendWithdrawalNotification } from '../services/emailService.js';

/* =========================
   DASHBOARD
========================= */
export const getDashboard = async (req, res) => {
  try {
    const [usersResult, depositsResult, withdrawalsResult, pendingResult, investmentsResult, balanceResult, profitsResult, recentResult] =
      await Promise.all([
        pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE email_verified = TRUE) AS verified FROM users WHERE is_admin = FALSE`),
        pool.query(`SELECT COUNT(*) AS count, COALESCE(SUM(amount),0) AS total FROM transactions WHERE type='deposit' AND status='completed'`),
        pool.query(`SELECT COUNT(*) AS count, COALESCE(SUM(net_amount),0) AS total FROM transactions WHERE type='withdrawal' AND status='completed'`),
        pool.query(`SELECT COUNT(*) AS count, COALESCE(SUM(net_amount),0) AS total FROM transactions WHERE type='withdrawal' AND status='pending'`),
        pool.query(`SELECT COUNT(*) AS count, COALESCE(SUM(invested_amount),0) AS total FROM user_investments WHERE status='active'`),
        pool.query(`SELECT COALESCE(SUM(balance),0) AS total FROM wallets`),
        pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE type='profit' AND status='completed'`),
        pool.query(`SELECT t.*, u.email, u.full_name FROM transactions t JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC LIMIT 10`)
      ]);

    res.json({
      success: true,
      data: {
        users: { total: Number(usersResult.rows[0].total), verified: Number(usersResult.rows[0].verified) },
        deposits: depositsResult.rows[0],
        withdrawals: withdrawalsResult.rows[0],
        pending_withdrawals: pendingResult.rows[0],
        investments: investmentsResult.rows[0],
        platform_balance: Number(balanceResult.rows[0].total),
        total_profits: Number(profitsResult.rows[0].total),
        recent_activities: recentResult.rows
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Dashboard error' });
  }
};

/* =========================
   USERS
========================= */
export const getAllUsers = async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);
    const search = req.query.search;

    let query = `SELECT u.*, w.balance, w.invested_amount, w.total_profit
                 FROM users u
                 LEFT JOIN wallets w ON u.id = w.user_id
                 WHERE u.is_admin = FALSE`;
    const params = [];
    if (search) {
      query += ` AND (u.email ILIKE $${params.length + 1} OR u.full_name ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    query += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const users = await pool.query(query, params);
    const countQuery = search
      ? `SELECT COUNT(*) FROM users WHERE is_admin = FALSE AND (email ILIKE $1 OR full_name ILIKE $1)`
      : `SELECT COUNT(*) FROM users WHERE is_admin = FALSE`;
    const countParams = search ? [`%${search}%`] : [];
    const count = await pool.query(countQuery, countParams);

    res.json({ success: true, data: { users: users.rows, total: Number(count.rows[0].count), limit, offset } });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

export const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userResult = await pool.query(`SELECT u.*, w.* FROM users u LEFT JOIN wallets w ON u.id = w.user_id WHERE u.id = $1`, [id]);
    if (!userResult.rows.length) return res.status(404).json({ success: false, message: 'User not found' });

    const investments = await pool.query(
      `SELECT ui.*, ip.name AS plan_name
       FROM user_investments ui
       JOIN investment_plans ip ON ui.plan_id = ip.id
       WHERE ui.user_id = $1`,
      [id]
    );
    const transactions = await Transaction.getUserTransactions(id, 50, 0);

    res.json({ success: true, data: { user: userResult.rows[0], investments: investments.rows, transactions } });
  } catch (err) {
    console.error('Get user details error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user details' });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return res.status(400).json({ success: false, message: 'isActive must be boolean' });

    const result = await pool.query(
      `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, is_active`,
      [isActive, id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: `User ${isActive ? 'activated' : 'deactivated'}`, data: result.rows[0] });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

/* =========================
   WITHDRAWALS
========================= */
export const getPendingWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Transaction.getPendingWithdrawals();
    res.json({ success: true, data: withdrawals });
  } catch (err) {
    console.error('Failed to fetch withdrawals:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch withdrawals' });
  }
};

export const approveWithdrawal = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');
    const tx = await Transaction.getById(id);
    if (!tx || tx.type !== 'withdrawal' || tx.status !== 'pending') throw new Error('Invalid withdrawal request');
    if (!blockchainService.isValidAddress(tx.to_address)) throw new Error('Invalid withdrawal address');

    const netAmount = Number(tx.amount) - Number(tx.fee || 0);
    const chainResult = await blockchainService.sendUsdt(tx.to_address, netAmount);
    if (!chainResult.success) throw new Error(chainResult.error);

    await client.query(
      `UPDATE transactions SET status='completed', tx_hash=$1, approved_by=$2, approved_at=NOW(), processed_at=NOW() WHERE id=$3`,
      [chainResult.txHash, req.user.id, id]
    );

    await client.query('COMMIT');
    await sendWithdrawalNotification(tx.user_id, tx.amount, 'approved');
    res.json({ success: true, message: 'Withdrawal approved & processed', data: { txHash: chainResult.txHash, blockNumber: chainResult.blockNumber } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Approve withdrawal error:', err);
    res.status(500).json({ success: false, message: err.message || 'Withdrawal approval failed' });
  } finally {
    client.release();
  }
};

export const rejectWithdrawal = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) throw new Error('Rejection reason required');

    await client.query('BEGIN');
    const tx = await Transaction.getById(id);
    if (!tx || tx.status !== 'pending') throw new Error('Invalid withdrawal request');

    await Wallet.updateBalance(tx.user_id, tx.amount, 'add');
    await client.query(
      `UPDATE transactions SET status='rejected', rejection_reason=$1, approved_by=$2, approved_at=NOW() WHERE id=$3`,
      [reason, req.user.id, id]
    );

    await client.query('COMMIT');
    await sendWithdrawalNotification(tx.user_id, tx.amount, 'rejected');

    res.json({ success: true, message: 'Withdrawal rejected & refunded' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reject withdrawal error:', err);
    res.status(500).json({ success: false, message: err.message || 'Rejection failed' });
  } finally {
    client.release();
  }
};

/* =========================
   TRANSACTIONS
========================= */
export const getAllTransactions = async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);
    const transactions = await Transaction.getAllTransactions(limit, offset);
    const countResult = await pool.query('SELECT COUNT(*) FROM transactions');
    res.json({ success: true, data: { transactions, total: Number(countResult.rows[0].count), limit, offset } });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

/* =========================
   INVESTMENTS
========================= */
export const getAllInvestments = async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);
    const investments = await pool.query(
      `SELECT ui.*, ip.name AS plan_name, u.email, u.full_name
       FROM user_investments ui
       JOIN investment_plans ip ON ui.plan_id = ip.id
       JOIN users u ON ui.user_id = u.id
       ORDER BY ui.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const countResult = await pool.query('SELECT COUNT(*) FROM user_investments');
    res.json({ success: true, data: { investments: investments.rows, total: Number(countResult.rows[0].count), limit, offset } });
  } catch (err) {
    console.error('Get investments error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch investments' });
  }
};

/* =========================
   SETTINGS
========================= */
export const getSettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings LIMIT 1');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const updates = req.body;
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    if (!keys.length) return res.status(400).json({ success: false, message: 'No updates provided' });

    const setQuery = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const result = await pool.query(`UPDATE settings SET ${setQuery} RETURNING *`, values);
    res.json({ success: true, message: 'Settings updated', data: result.rows[0] });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};
