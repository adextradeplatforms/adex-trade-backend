import pool from '../config/database.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import { validateAmount } from '../utils/validators.js';
import { processDepositBonuses } from '../services/referralService.js';
import blockchainService from '../services/blockchainService.js';

/* ============================
   GET USER WALLET
============================ */
export const getWallet = async (req, res) => {
  try {
    const wallet = await Wallet.getByUserId(req.user.id);
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    res.json({ success: true, data: wallet });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch wallet' });
  }
};

/* ============================
   CREATE DEPOSIT (PENDING)
============================ */
export const createDeposit = async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount, txHash, fromAddress } = req.body;
    const minDeposit = Number(process.env.MIN_DEPOSIT || 20);

    // Basic validation
    if (!validateAmount(amount, minDeposit)) {
      return res.status(400).json({
        success: false,
        message: `Minimum deposit is ${minDeposit} USDT`
      });
    }

    if (!txHash || !fromAddress) {
      return res.status(400).json({
        success: false,
        message: 'Transaction hash and sender address are required'
      });
    }

    // Blockchain address validation
    if (!blockchainService.isValidAddress(fromAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sender address'
      });
    }

    await client.query('BEGIN');

    // Prevent duplicate tx
    const existingTx = await client.query(
      'SELECT id FROM transactions WHERE tx_hash = $1',
      [txHash]
    );

    if (existingTx.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This transaction has already been submitted'
      });
    }

    // Create pending deposit
    const transaction = await Transaction.create({
      userId: req.user.id,
      type: 'deposit',
      amount: Number(amount),
      fee: 0,
      status: 'pending',
      txHash,
      fromAddress,
      toAddress: process.env.PLATFORM_WALLET_ADDRESS
    });

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Deposit created. Waiting for blockchain confirmation.',
      data: transaction
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create deposit request'
    });
  } finally {
    client.release();
  }
};

/* ============================
   CONFIRM DEPOSIT (SERVICE / ADMIN)
============================ */
export const confirmDeposit = async (transactionId, adminId = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const transaction = await Transaction.getById(transactionId);
    if (!transaction) throw new Error('Transaction not found');
    if (transaction.status !== 'pending') throw new Error('Already processed');

    // Credit wallet
    await Wallet.updateBalance(
      transaction.user_id,
      transaction.amount,
      'add'
    );

    // Mark transaction completed
    await Transaction.updateStatus(
      transactionId,
      'completed',
      adminId
    );

    // Referral bonuses
    await processDepositBonuses(
      client,
      transaction.user_id,
      transaction.amount,
      transactionId
    );

    await client.query('COMMIT');
    return { success: true };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Confirm deposit error:', error);
    throw error;
  } finally {
    client.release();
  }
};

/* ============================
   CREATE WITHDRAWAL
============================ */
export const createWithdrawal = async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount, toAddress } = req.body;
    const minWithdrawal = Number(process.env.MIN_WITHDRAWAL || 10);

    if (!validateAmount(amount, minWithdrawal)) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal is ${minWithdrawal} USDT`
      });
    }

    if (!toAddress) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal address is required'
      });
    }

    if (!blockchainService.isValidAddress(toAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid withdrawal address'
      });
    }

    // Withdrawal window
    const currentHour = new Date().getUTCHours();
    const startHour = Number(process.env.WITHDRAWAL_START_HOUR || 8);
    const endHour = Number(process.env.WITHDRAWAL_END_HOUR || 20);

    if (currentHour < startHour || currentHour >= endHour) {
      return res.status(400).json({
        success: false,
        message: `Withdrawals allowed ${startHour}:00 - ${endHour}:00 UTC`
      });
    }

    const wallet = await Wallet.getByUserId(req.user.id);
    if (!wallet) throw new Error('Wallet not found');

    const feePercent = Number(process.env.WITHDRAWAL_FEE_PERCENT || 5);
    const fee = (Number(amount) * feePercent) / 100;

    if (Number(wallet.balance) < Number(amount)) {
      throw new Error('Insufficient balance');
    }

    await client.query('BEGIN');

    await Wallet.updateBalance(req.user.id, amount, 'subtract');

    const transaction = await Transaction.create({
      userId: req.user.id,
      type: 'withdrawal',
      amount: Number(amount),
      fee,
      status: 'pending',
      toAddress
    });

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted',
      data: transaction
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Withdrawal failed'
    });
  } finally {
    client.release();
  }
};

/* ============================
   GET TRANSACTIONS
============================ */
export const getTransactions = async (req, res) => {
  try {
    const { limit = 50, offset = 0, type } = req.query;
    const params = [req.user.id];

    let query = 'SELECT * FROM transactions WHERE user_id = $1';
    if (type) {
      query += ' AND type = $2';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT $3 OFFSET $4';
    params.push(Number(limit), Number(offset));

    const result = await pool.query(query, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

/* ============================
   GET TRANSACTION BY ID
============================ */
export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transaction' });
  }
};
