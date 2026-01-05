import logger from '../config/logger.js';

/**
 * Format currency amount
 */
export const formatCurrency = (amount, decimals = 2) => {
  return Number.parseFloat(amount).toFixed(decimals);
};

/**
 * Calculate withdrawal fee
 */
export const calculateWithdrawalFee = (amount, feePercent = null) => {
  const percent = feePercent ?? Number(process.env.WITHDRAWAL_FEE_PERCENT || 5);
  const parsedAmount = Number(amount);

  const fee = (parsedAmount * percent) / 100;
  const netAmount = parsedAmount - fee;

  return {
    amount: parsedAmount,
    feePercent: percent,
    fee,
    netAmount,
    formatted: {
      amount: formatCurrency(parsedAmount),
      fee: formatCurrency(fee),
      netAmount: formatCurrency(netAmount)
    }
  };
};

/**
 * Validate transaction amount
 */
export const validateTransactionAmount = (amount, type = 'deposit') => {
  const parsedAmount = Number(amount);

  if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return { valid: false, message: 'Invalid amount' };
  }

  if (type === 'deposit') {
    const minDeposit = Number(process.env.MIN_DEPOSIT || 20);
    if (parsedAmount < minDeposit) {
      return {
        valid: false,
        message: `Minimum deposit is ${minDeposit} USDT`
      };
    }
  }

  if (type === 'withdrawal') {
    const minWithdrawal = Number(process.env.MIN_WITHDRAWAL || 10);
    if (parsedAmount < minWithdrawal) {
      return {
        valid: false,
        message: `Minimum withdrawal is ${minWithdrawal} USDT`
      };
    }
  }

  return { valid: true, amount: parsedAmount };
};

/**
 * Get transaction type display info
 */
export const getTransactionTypeInfo = (type) => {
  const types = {
    deposit: { label: 'Deposit', icon: '💰', color: 'green', sign: '+' },
    withdrawal: { label: 'Withdrawal', icon: '💸', color: 'red', sign: '-' },
    profit: { label: 'Profit', icon: '📈', color: 'green', sign: '+' },
    referral_bonus: { label: 'Referral Bonus', icon: '🎁', color: 'green', sign: '+' },
    investment: { label: 'Investment', icon: '📊', color: 'blue', sign: '-' },
    investment_return: { label: 'Investment Return', icon: '↩️', color: 'green', sign: '+' },
    internal_transfer_in: { label: 'Transfer In', icon: '⬇️', color: 'green', sign: '+' },
    internal_transfer_out: { label: 'Transfer Out', icon: '⬆️', color: 'red', sign: '-' }
  };

  return types[type] ?? {
    label: type,
    icon: '📝',
    color: 'gray',
    sign: ''
  };
};

/**
 * Get transaction status info
 */
export const getTransactionStatusInfo = (status) => {
  const statuses = {
    pending: { label: 'Pending', icon: '⏳', color: 'yellow' },
    completed: { label: 'Completed', icon: '✅', color: 'green' },
    failed: { label: 'Failed', icon: '❌', color: 'red' },
    rejected: { label: 'Rejected', icon: '🚫', color: 'red' },
    cancelled: { label: 'Cancelled', icon: '⭕', color: 'gray' }
  };

  return statuses[status] ?? {
    label: status,
    icon: '❓',
    color: 'gray'
  };
};

/**
 * Calculate portfolio metrics
 */
export const calculatePortfolioMetrics = (wallet) => {
  const balance = Number(wallet.balance || 0);
  const invested = Number(wallet.invested_amount || 0);
  const profit = Number(wallet.total_profit || 0);
  const referral = Number(wallet.total_referral_bonus || 0);

  const totalAssets = balance + invested;
  const roi = invested > 0 ? (profit / invested) * 100 : 0;

  return {
    totalAssets,
    availableBalance: balance,
    investedAmount: invested,
    totalProfit: profit,
    totalReferralBonus: referral,
    roi: roi.toFixed(2),
    formatted: {
      totalAssets: formatCurrency(totalAssets, 8),
      availableBalance: formatCurrency(balance, 8),
      investedAmount: formatCurrency(invested, 8),
      totalProfit: formatCurrency(profit, 8),
      totalReferralBonus: formatCurrency(referral, 8)
    }
  };
};

/**
 * Generate transaction receipt
 */
export const generateTransactionReceipt = (transaction) => {
  const typeInfo = getTransactionTypeInfo(transaction.type);
  const statusInfo = getTransactionStatusInfo(transaction.status);

  return {
    id: transaction.id,
    type: { ...typeInfo, value: transaction.type },
    status: { ...statusInfo, value: transaction.status },
    amount: {
      value: Number(transaction.amount),
      formatted: formatCurrency(transaction.amount, 8),
      display: `${typeInfo.sign}${formatCurrency(transaction.amount, 8)} USDT`
    },
    fee: {
      value: Number(transaction.fee || 0),
      formatted: formatCurrency(transaction.fee || 0, 8)
    },
    netAmount: {
      value: Number(transaction.net_amount || 0),
      formatted: formatCurrency(transaction.net_amount || 0, 8)
    },
    txHash: transaction.tx_hash,
    fromAddress: transaction.from_address,
    toAddress: transaction.to_address,
    createdAt: transaction.created_at,
    approvedAt: transaction.approved_at,
    rejectionReason: transaction.rejection_reason
  };
};

/**
 * Validate BEP20 address
 */
export const validateBEP20Checksum = (address) => {
  try {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  } catch (error) {
    logger.error('Address validation error:', error);
    return false;
  }
};

/**
 * Get wallet health status
 */
export const getWalletHealthStatus = (wallet) => {
  const balance = Number(wallet.balance || 0);
  const invested = Number(wallet.invested_amount || 0);
  const profit = Number(wallet.total_profit || 0);

  const health = {
    status: 'healthy',
    issues: [],
    warnings: []
  };

  if (balance < 0) {
    health.issues.push('Negative balance detected');
  }

  if (balance + invested > 0 && invested / (balance + invested) > 0.95) {
    health.warnings.push('Over 95% of funds are invested');
  }

  if (invested > 0 && profit > invested * 2) {
    health.warnings.push('Unusually high profit ratio');
  }

  if (health.issues.length) health.status = 'critical';
  else if (health.warnings.length) health.status = 'warning';

  return health;
};
