import pool from '../config/database.js';
import logger from '../config/logger.js';

/**
 * ===================== BLOCKCHAIN CONFIRM DEPOSIT =====================
 * Called ONLY by blockchain service after on-chain verification
 */
export const confirmDepositByService = async (transactionId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const txRes = await client.query(
      `SELECT * FROM transactions 
       WHERE id = $1 AND type = 'deposit' 
       FOR UPDATE`,
      [transactionId]
    );

    if (!txRes.rows.length) {
      throw new Error('Deposit transaction not found');
    }

    const tx = txRes.rows[0];

    if (tx.status !== 'pending') {
      await client.query('ROLLBACK');
      return;
    }

    // Credit wallet
    await client.query(
      `UPDATE wallets 
       SET balance = balance + $1, updated_at = NOW()
       WHERE user_id = $2`,
      [tx.amount, tx.user_id]
    );

    // Mark transaction completed
    await client.query(
      `UPDATE transactions 
       SET status = 'completed',
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [transactionId]
    );

    await client.query('COMMIT');

    logger.info('Deposit confirmed by blockchain service', {
      transactionId,
      userId: tx.user_id,
      amount: tx.amount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('confirmDepositByService error:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * ===================== USER WALLET DETAILS =====================
 */
export const getWalletDetails = async (userId) => {
  const result = await pool.query(
    `SELECT 
       w.*,
       (SELECT COUNT(*) FROM user_investments WHERE user_id = $1 AND status = 'active') AS active_investments,
       (SELECT COUNT(*) FROM transactions WHERE user_id = $1 AND type = 'deposit' AND status = 'completed') AS total_deposits_count,
       (SELECT COALESCE(SUM(amount),0) FROM transactions WHERE user_id = $1 AND type = 'deposit' AND status = 'completed') AS total_deposits_amount,
       (SELECT COUNT(*) FROM transactions WHERE user_id = $1 AND type = 'withdrawal' AND status = 'completed') AS total_withdrawals_count,
       (SELECT COALESCE(SUM(net_amount),0) FROM transactions WHERE user_id = $1 AND type = 'withdrawal' AND status = 'completed') AS total_withdrawals_amount,
       (SELECT COUNT(*) FROM transactions WHERE user_id = $1 AND type = 'withdrawal' AND status = 'pending') AS pending_withdrawals
     FROM wallets w
     WHERE w.user_id = $1`,
    [userId]
  );

  return result.rows[0] || null;
};

/**
 * ===================== CREATE DEPOSIT (TX HASH) =====================
 */
export const createDepositTransaction = async (userId, amount, txHash, fromAddress) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const exists = await client.query(
      'SELECT id FROM transactions WHERE tx_hash = $1',
      [txHash]
    );

    if (exists.rows.length) {
      throw new Error('Transaction already processed');
    }

    const result = await client.query(
      `INSERT INTO transactions
       (user_id, type, amount, fee, net_amount, status, tx_hash, from_address, to_address)
       VALUES ($1,'deposit',$2,0,$2,'pending',$3,$4,$5)
       RETURNING *`,
      [userId, amount, txHash, fromAddress, process.env.PLATFORM_WALLET_ADDRESS]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * ===================== WITHDRAWAL REQUEST =====================
 */
export const createWithdrawalRequest = async (userId, amount, toAddress) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const walletRes = await client.query(
      'SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    if (!walletRes.rows.length) throw new Error('Wallet not found');
    if (Number(walletRes.rows[0].balance) < Number(amount)) {
      throw new Error('Insufficient balance');
    }

    const feePercent = Number(process.env.WITHDRAWAL_FEE_PERCENT || 5);
    const fee = (amount * feePercent) / 100;
    const netAmount = amount - fee;

    await client.query(
      'UPDATE wallets SET balance = balance - $1 WHERE user_id = $2',
      [amount, userId]
    );

    const result = await client.query(
      `INSERT INTO transactions
       (user_id,type,amount,fee,net_amount,status,to_address)
       VALUES ($1,'withdrawal',$2,$3,$4,'pending',$5)
       RETURNING *`,
      [userId, amount, fee, netAmount, toAddress]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * ===================== BASIC HELPERS =====================
 */
export const validateWithdrawalAddress = (address) =>
  /^0x[a-fA-F0-9]{40}$/.test(address);

export const hasPendingWithdrawal = async (userId) => {
  const r = await pool.query(
    `SELECT COUNT(*) FROM transactions
     WHERE user_id=$1 AND type='withdrawal' AND status='pending'`,
    [userId]
  );
  return Number(r.rows[0].count) > 0;
};
