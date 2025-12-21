// utils/depositWatcher.js
import Web3 from "web3";
import Deposit from "../models/Deposit.js";
import User from "../models/User.js";

const BSC_RPC = process.env.BSC_RPC;
const OWNER_ADDRESS = process.env.OWNER_ADDRESS;
const USDT_ADDRESS = process.env.USDT_ADDRESS;

const web3 = new Web3(BSC_RPC);

// USDT ABI minimal for transfer event
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
    name: "Transfer",
    type: "event",
  },
];

const usdtContract = new web3.eth.Contract(USDT_ABI, USDT_ADDRESS);

export const watchDeposits = async () => {
  console.log("Deposit watcher started...");

  // Listen for Transfer events
  usdtContract.events
    .Transfer({ filter: { to: OWNER_ADDRESS } })
    .on("data", async (event) => {
      try {
        const { from, to, value } = event.returnValues;
        const txHash = event.transactionHash;

        // Convert value from wei to USDT (BEP20 uses 18 decimals)
        const amount = web3.utils.fromWei(value, "ether");

        // Check if deposit already recorded
        const existing = await Deposit.findOne({ txHash });
        if (existing) return;

        // Find user by wallet address (optional)
        const user = await User.findOne({ "wallets.USDT.address": from });

        if (!user) {
          console.log("Deposit from unknown wallet:", from);
          return;
        }

        // Record deposit
        const deposit = await Deposit.create({
          user: user._id,
          amount,
          txHash,
          status: "confirmed",
        });

        // Update user balance
        user.balance += parseFloat(amount);
        await user.save();

        console.log(`Deposit recorded: ${amount} USDT from ${from}`);
      } catch (err) {
        console.error("Watcher error:", err);
      }
    })
    .on("error", console.error);
};
