import mongoose from "mongoose";

const priceSchema = new mongoose.Schema(
  {
    currency: { type: String, required: true, unique: true },
    priceUSD: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Price", priceSchema);
