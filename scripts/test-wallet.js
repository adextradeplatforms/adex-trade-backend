#!/usr/bin/env node

import * as walletService from '../src/services/walletService.js';
import pool from '../src/config/database.js';

console.log('🧪 Starting Wallet Service Tests\n');
console.log('='.repeat(80));

try {
  // Get a test user (verified)
  const userResult = await pool.query(
    'SELECT id FROM users WHERE email_verified = TRUE LIMIT 1'
  );

  if (userResult.rows.length === 0) {
    console.log('❌ No verified users found. Create a user first.');
    process.exit(1);
  }

  const userId = userResult.rows[0].id;
  console.log(`\n✅ Using test user ID: ${userId}\n`);

  // Test 1: Get wallet details
  try {
    console.log('1️⃣ Testing getWalletDetails...');
    const wallet = await walletService.getWalletDetails(userId);

    if (!wallet) throw new Error('Wallet not found for user');

    console.log('✅ Wallet retrieved:');
    console.log(`   Balance: ${wallet.balance}`);
    console.log(`   Invested: ${wallet.invested_amount}`);
    console.log(`   Total Profit: ${wallet.total_profit}`);
  } catch (err) {
    console.error('❌ getWalletDetails failed:', err.message);
  }

  // Test 2: Withdrawal time window
  try {
    console.log('\n2️⃣ Testing withdrawal time window...');
    const isAllowed = walletService.isWithdrawalTimeAllowed();
    const timeWindow = walletService.getWithdrawalTimeWindow();
    console.log('✅ Withdrawal allowed:', isAllowed);
    console.log(`   Allowed window: ${timeWindow.startHour}:00 - ${timeWindow.endHour}:00 UTC`);
  } catch (err) {
    console.error('❌ Withdrawal time test failed:', err.message);
  }

  // Test 3: Address validation
  try {
    console.log('\n3️⃣ Testing address validation...');
    const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
    const invalidAddress = 'invalid_address';
    console.log('   Valid address result:', walletService.validateWithdrawalAddress(validAddress));
    console.log('   Invalid address result:', walletService.validateWithdrawalAddress(invalidAddress));
  } catch (err) {
    console.error('❌ Address validation test failed:', err.message);
  }

  // Test 4: Transaction summary
  try {
    console.log('\n4️⃣ Testing transaction summary (last 30 days)...');
    const summary = await walletService.getTransactionSummary(userId, 30);
    console.log(`✅ Transaction summary retrieved: ${summary.length} entries`);
  } catch (err) {
    console.error('❌ Transaction summary test failed:', err.message);
  }

  // Test 5: Balance history
  try {
    console.log('\n5️⃣ Testing balance history (last 7 days)...');
    const history = await walletService.getBalanceHistory(userId, 7);
    console.log(`✅ Balance history retrieved: ${history.length} days`);
  } catch (err) {
    console.error('❌ Balance history test failed:', err.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 All tests executed! Check logs above for individual results.');

} catch (error) {
  console.error('\n❌ Wallet service tests failed:', error);
} finally {
  // Close DB connection
  await pool.end();
  process.exit(0);
}
