import { ethers } from "ethers";
import User from "../models/User.js";
import Deposit from "../models/Deposit.js";

const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC);

// USDT BEP20 ABI (Transfer event only)
const USDT_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

const usdtContract = new ethers.Contract(
  process.env.USDT_ADDRESS,
  USDT_ABI,
  provider
);

const startDepositWatcher = async () => {
  console.log("🟢 Deposit watcher started...");

  usdtContract.on("Transfer", async (from, to, value, event) => {
    try {
      // Only watch deposits sent to owner
      if (to.toLowerCase() !== process.env.OWNER_ADDRESS.toLowerCase()) return;

      const amount = Number(ethers.formatUnits(value, 18));
      const txHash = event.log.transactionHash;

      // Prevent duplicate deposits
      const exists = await Deposit.findOne({ txHash });
      if (exists) return;

      // Find user by wallet
      const user = await User.findOne({
        "wallets.USDT.address": from.toLowerCase(),
      });

      if (!user) {
        console.log("❌ Deposit from unknown wallet:", from);
        return;
      }

      // Save deposit
      await Deposit.create({
        user: user._id,
        amount,
        txHash,
        status: "confirmed",
      });

      // Update balance
      user.balance += amount;
      await user.save();

      console.log(`✅ Deposit recorded: ${amount} USDT for ${user.email}`);
    } catch (err) {
      console.error("Deposit watcher error:", err.message);
    }
  });
};

export default startDepositWatcher;
