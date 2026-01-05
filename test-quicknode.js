import dotenv from "dotenv";
import { JsonRpcProvider, Contract, formatUnits, formatEther } from "ethers";

dotenv.config();

async function testConnection() {
  console.log("🔍 Testing QuickNode Connection...\n");

  try {
    if (!process.env.BLOCKCHAIN_RPC_URL) {
      throw new Error("BSC_RPC_URL missing in .env");
    }

    const provider = new JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);

    // Test 1: Network
    const network = await provider.getNetwork();
    console.log("✅ Connected to network:", network.name);
    console.log("   Chain ID:", network.chainId.toString());

    // Test 2: Latest block
    const blockNumber = await provider.getBlockNumber();
    console.log("✅ Latest block:", blockNumber);

    // Test 3: Gas price
    const feeData = await provider.getFeeData();
    console.log(
      "✅ Gas price:",
      formatUnits(feeData.gasPrice, "gwei"),
      "Gwei"
    );

    // Test 4: USDT contract
    const usdtAbi = [
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
      "function balanceOf(address) view returns (uint256)"
    ];

    const usdt = new Contract(
      process.env.USDT_CONTRACT_ADDRESS,
      usdtAbi,
      provider
    );

    const symbol = await usdt.symbol();
    const decimals = await usdt.decimals();

    console.log("✅ USDT Contract:");
    console.log("   Symbol:", symbol);
    console.log("   Decimals:", decimals.toString());

    // Test 5: Platform wallet balance
    if (process.env.PLATFORM_WALLET_ADDRESS) {
      const bnbBalance = await provider.getBalance(
        process.env.PLATFORM_WALLET_ADDRESS
      );

      const usdtBalance = await usdt.balanceOf(
        process.env.PLATFORM_WALLET_ADDRESS
      );

      console.log(
        "✅ Platform BNB balance:",
        formatEther(bnbBalance),
        "BNB"
      );

      console.log(
        "✅ Platform USDT balance:",
        formatUnits(usdtBalance, decimals),
        "USDT"
      );
    }

    console.log("\n🎉 All QuickNode tests PASSED\n");

  } catch (err) {
    console.error("❌ Test failed:", err.message);
  }
}

testConnection();
