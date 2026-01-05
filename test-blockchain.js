import 'dotenv/config';
import blockchainService from './src/services/blockchainService.js';

async function test() {
  console.log('🔗 Testing blockchain connection...\n');

  console.log('✓ RPC URL:', process.env.BSC_RPC_URL);
  console.log('✓ USDT Contract:', process.env.USDT_CONTRACT_ADDRESS);
  console.log('✓ Platform Wallet:', process.env.PLATFORM_WALLET_ADDRESS);

  // Test gas price
  const gasPrice = await blockchainService.getGasPrice();
  console.log('✓ Current Gas Price:', gasPrice, 'Gwei\n');

  // Test wallet balance
  const balance = await blockchainService.getUsdtBalance(
    process.env.PLATFORM_WALLET_ADDRESS
  );
  console.log('✓ Platform Wallet USDT Balance:', balance, 'USDT\n');

  // Test address validation
  const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const isValid = blockchainService.isValidAddress(testAddress);
  console.log('✓ Address validation test:', isValid ? 'PASS' : 'FAIL');

  console.log('\n✅ Blockchain service working correctly!');
}

test().catch(err => {
  console.error('❌ Test failed:', err);
});
