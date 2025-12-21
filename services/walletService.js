// services/userWallet.js
import User from "../models/User.js";
import { generateBEP20Wallet } from "./walletService.js";

export const createUserWallet = async (userId) => {
  const wallet = await generateBEP20Wallet();
  const user = await User.findById(userId);
  user.wallets.USDT.address = wallet.address;
  await user.save();
  return wallet;
};
