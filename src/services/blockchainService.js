// src/services/blockchainService.js
import { ethers } from 'ethers';
import pool from '../config/database.js';
import { confirmDepositByService } from './walletService.js';

// Minimal USDT ABI
const USDT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

class BlockchainService {
  constructor() {
    // Initialize provider
    this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);

    // Initialize USDT contract
    this.usdtContract = new ethers.Contract(
      process.env.USDT_CONTRACT_ADDRESS,
      USDT_ABI,
      this.provider
    );

    // Platform wallet for sending USDT (withdrawals)
    this.platformWallet = process.env.PLATFORM_WALLET_PRIVATE_KEY
      ? new ethers.Wallet(process.env.PLATFORM_WALLET_PRIVATE_KEY, this.provider)
      : null;

    this.isListening = false;
    this.usdtDecimals = 6; // default, will fetch from chain
  }

  /** Initialize blockchain (fetch USDT decimals) */
  async initialize() {
    try {
      this.usdtDecimals = await this.usdtContract.decimals();
      console.log(`✅ Blockchain initialized (USDT decimals: ${this.usdtDecimals})`);
    } catch (err) {
      console.error('❌ Blockchain initialization failed:', err);
      throw err;
    }
  }

  /** Start listening for deposits to the platform wallet */
  startDepositListener() {
    if (this.isListening) return;

    const platformWallet = process.env.PLATFORM_WALLET_ADDRESS.toLowerCase();

    const handler = async (from, to, value, event) => {
      try {
        if (to.toLowerCase() !== platformWallet) return;

        const txHash = event.log.transactionHash;
        const amount = parseFloat(ethers.formatUnits(value, this.usdtDecimals));

        const receipt = await this.provider.getTransactionReceipt(txHash);
        if (!receipt) return console.warn(`⚠️ Transaction not found: ${txHash}`);

        const confirmations = (await this.provider.getBlockNumber()) - receipt.blockNumber;
        if (confirmations < parseInt(process.env.CONFIRMATION_BLOCKS || '3')) return;

        const pending = await pool.query(
          `SELECT id, amount FROM transactions WHERE tx_hash = $1 AND type = 'deposit' AND status = 'pending'`,
          [txHash]
        );

        if (!pending.rows.length) return;

        const dbAmount = Number(pending.rows[0].amount);
        if (Math.abs(dbAmount - amount) > 0.000001) {
          console.warn(`⚠️ Amount mismatch: DB=${dbAmount}, On-chain=${amount}, TX=${txHash}`);
          return;
        }

        await confirmDepositByService(pending.rows[0].id).catch(err =>
          console.error(`❌ Error confirming deposit ID ${pending.rows[0].id}:`, err)
        );

        console.log(`✅ Deposit confirmed: ${amount} USDT (${txHash})`);
      } catch (err) {
        console.error('❌ Deposit listener error:', err);
      }
    };

    this.usdtContract.on('Transfer', handler);
    this.isListening = true;
    console.log('👂 USDT deposit listener started (safe mode)');
  }

  /** Stop deposit listener */
  stopDepositListener() {
    if (!this.isListening) return;
    this.usdtContract.removeAllListeners('Transfer');
    this.isListening = false;
    console.log('🛑 Deposit listener stopped');
  }

  /** Verify a deposit transaction */
  async verifyDeposit(txHash, expectedAmount, fromAddress = null) {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) return { valid: false, error: 'Transaction not found' };
      if (receipt.status !== 1) return { valid: false, error: 'Transaction failed' };

      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;

      if (confirmations < parseInt(process.env.CONFIRMATION_BLOCKS || '3')) {
        return { valid: false, error: 'Not enough confirmations', pending: true };
      }

      const iface = new ethers.Interface(USDT_ABI);
      let transferFound = false;
      let transferAmount = 0n;

      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== process.env.USDT_CONTRACT_ADDRESS.toLowerCase()) continue;

        try {
          const parsed = iface.parseLog(log);
          if (parsed.name !== 'Transfer') continue;

          const { from, to, value } = parsed.args;
          if (to.toLowerCase() === process.env.PLATFORM_WALLET_ADDRESS.toLowerCase()) {
            transferFound = true;
            transferAmount = value;

            if (fromAddress && from.toLowerCase() !== fromAddress.toLowerCase()) {
              return { valid: false, error: 'Sender address mismatch' };
            }
          }
        } catch (_) {
          continue;
        }
      }

      if (!transferFound) return { valid: false, error: 'No USDT transfer found to platform wallet' };

      const amountInUsdt = parseFloat(ethers.formatUnits(transferAmount, this.usdtDecimals));
      if (Math.abs(amountInUsdt - expectedAmount) > 0.01) {
        return { valid: false, error: `Amount mismatch. Expected: ${expectedAmount}, Got: ${amountInUsdt}` };
      }

      return { valid: true, amount: amountInUsdt, confirmations, blockNumber: receipt.blockNumber };
    } catch (err) {
      console.error('❌ Verify deposit error:', err);
      return { valid: false, error: err.message };
    }
  }

  /** Get USDT balance */
  async getUsdtBalance(address) {
    try {
      const balance = await this.usdtContract.balanceOf(address);
      return parseFloat(ethers.formatUnits(balance, this.usdtDecimals));
    } catch (err) {
      console.error('❌ Get balance error:', err);
      throw err;
    }
  }

  /** Send USDT from platform wallet (withdrawals) */
  async sendUsdt(toAddress, amount) {
    try {
      if (!this.platformWallet) throw new Error('Platform wallet not configured');

      const amountInWei = ethers.parseUnits(amount.toString(), this.usdtDecimals);
      const contractWithSigner = this.usdtContract.connect(this.platformWallet);
      const tx = await contractWithSigner.transfer(toAddress, amountInWei);
      const receipt = await tx.wait();

      return { success: true, txHash: receipt.transactionHash, blockNumber: receipt.blockNumber };
    } catch (err) {
      console.error('❌ Send USDT error:', err);
      return { success: false, error: err.message };
    }
  }

  /** Validate a blockchain address */
  isValidAddress(address) {
    return ethers.isAddress(address);
  }

  /** Get current gas price in gwei */
  async getGasPrice() {
    const feeData = await this.provider.getFeeData();
    return ethers.formatUnits(feeData.gasPrice, 'gwei');
  }
}

// Singleton instance
const blockchainService = new BlockchainService();

// Named exports for server.js
export const initializeBlockchain = () => blockchainService.initialize();
export const startDepositListener = () => blockchainService.startDepositListener();

// Default export
export default blockchainService;
