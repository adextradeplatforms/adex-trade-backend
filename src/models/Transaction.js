// src/models/Transaction.js
import pool from '../config/database.js';

class Transaction {
  // Create a new transaction
  static async create(data) {
    const {
      userId,
      type,
      amount,
      fee = 0,
      status = 'pending',
      txHash = null,
      fromAddress = null,
      toAddress = null,
      investmentId = null,
      referralUserId = null,
      approvedBy = null // NEW FIELD
    } = data;

    const netAmount = amount - fee;

    const result = await pool.query(
      `INSERT INTO transactions
       (user_id, type, amount, fee, net_amount, status, tx_hash, from_address, to_address, investment_id, referral_user_id, approved_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [userId, type, amount, fee, netAmount, status, txHash, fromAddress, toAddress, investmentId, referralUserId, approvedBy]
    );

    return result.rows[0];
  }

  // Get transaction by ID
  static async getById(transactionId) {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE id = $1',
      [transactionId]
    );
    return result.rows[0];
  }

  // Update status (supports approved_by and rejection_reason)
  static async updateStatus(transactionId, status, approvedBy = null, rejectionReason = null) {
    const result = await pool.query(
      `UPDATE transactions
       SET status = $1,
           approved_by = $2,
           approved_at = CASE WHEN $1 IN ('completed', 'rejected') THEN NOW() ELSE approved_at END,
           rejection_reason = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, approvedBy, rejectionReason, transactionId]
    );
    return result.rows[0];
  }

  // Get all transactions for a user
  static async getUserTransactions(userId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  // Get pending withdrawals
  static async getPendingWithdrawals() {
    const result = await pool.query(
      `SELECT t.*, u.email, u.full_name, a.full_name AS approved_by_name
       FROM transactions t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN users a ON t.approved_by = a.id
       WHERE t.type = 'withdrawal' AND t.status = 'pending'
       ORDER BY t.created_at ASC`
    );
    return result.rows;
  }

  // Get all transactions with optional limit/offset
  static async getAllTransactions(limit = 100, offset = 0) {
    const result = await pool.query(
      `SELECT t.*, u.email, u.full_name, a.full_name AS approved_by_name
       FROM transactions t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN users a ON t.approved_by = a.id
       ORDER BY t.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  // Get transactions filtered by type
  static async getTransactionsByType(type, limit = 50) {
    const result = await pool.query(
      `SELECT t.*, u.email, u.full_name, a.full_name AS approved_by_name
       FROM transactions t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN users a ON t.approved_by = a.id
       WHERE t.type = $1
       ORDER BY t.created_at DESC
       LIMIT $2`,
      [type, limit]
    );
    return result.rows;
  }
}

export default Transaction;
