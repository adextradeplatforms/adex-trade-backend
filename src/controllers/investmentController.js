import pool from '../config/database.js';
import Investment from '../models/Investment.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import { validateAmount } from '../utils/validators.js';
import { calculateProfit } from '../services/profitService.js';

// Get all investment plans
export const getPlans = async (req, res) => {
  try {
    const plans = await Investment.getAllPlans();
    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch investment plans' });
  }
};

// Create new investment
export const createInvestment = async (req, res) => {
  const client = await pool.connect();
  try {
    const { planId, amount } = req.body;
    if (!planId || !amount) return res.status(400).json({ success: false, message: 'Plan ID and amount are required' });
    if (!validateAmount(amount, 0)) return res.status(400).json({ success: false, message: 'Invalid amount' });

    await client.query('BEGIN');

    const plan = await Investment.getPlanById(planId);
    if (!plan || !plan.is_active) throw new Error('Investment plan not available');

    const investAmount = Number(amount);
    if (investAmount < Number(plan.min_investment)) throw new Error(`Minimum investment is ${plan.min_investment} USDT`);
    if (plan.max_investment && investAmount > Number(plan.max_investment)) throw new Error(`Maximum investment is ${plan.max_investment} USDT`);

    const wallet = await Wallet.getByUserId(req.user.id);
    if (!wallet || Number(wallet.balance) < investAmount) throw new Error('Insufficient balance');

    const investment = await Investment.createUserInvestment(req.user.id, planId, investAmount);
    await Wallet.addInvestment(req.user.id, investAmount);

    await Transaction.create({
      userId: req.user.id,
      type: 'investment',
      amount: investAmount,
      fee: 0,
      status: 'completed',
      investmentId: investment.id
    });

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Investment created successfully',
      data: { ...investment, plan_name: plan.name }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create investment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create investment' });
  } finally {
    client.release();
  }
};

// Stop investment
export const stopInvestment = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const investment = await Investment.getInvestmentById(id);
    if (!investment || investment.user_id !== req.user.id) throw new Error('Investment not found or access denied');
    if (investment.status !== 'active') throw new Error('Investment is not active');

    // Calculate profit for this investment before stopping
    await calculateProfit(client, investment);

    await Investment.stopInvestment(id);

    await Wallet.returnInvestment(req.user.id, Number(investment.invested_amount));

    await Transaction.create({
      userId: req.user.id,
      type: 'investment_return',
      amount: Number(investment.invested_amount),
      fee: 0,
      status: 'completed',
      investmentId: id
    });

    await client.query('COMMIT');

    res.json({ success: true, message: 'Investment stopped successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Stop investment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to stop investment' });
  } finally {
    client.release();
  }
};

// Get user's investments
export const getMyInvestments = async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    const investments = await Investment.getUserInvestments(req.user.id, status);
    res.json({ success: true, data: investments });
  } catch (error) {
    console.error('Get investments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch investments' });
  }
};

// Get investment by ID
export const getInvestmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const investment = await Investment.getInvestmentById(id);
    if (!investment || investment.user_id !== req.user.id) return res.status(404).json({ success: false, message: 'Investment not found' });

    const profitHistory = await pool.query(
      `SELECT * FROM profit_calculations WHERE investment_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [id]
    );

    res.json({ success: true, data: { ...investment, profit_history: profitHistory.rows } });
  } catch (error) {
    console.error('Get investment error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch investment' });
  }
};
