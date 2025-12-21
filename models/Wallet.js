import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    currency: { type: String, required: true },
    address: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Wallet", walletSchema);
