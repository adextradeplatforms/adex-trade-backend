import Price from "../models/Price.js";

export const getPrices = async (req, res) => {
  const prices = await Price.find();
  res.json(prices);
};

export const updatePrice = async (req, res) => {
  const { id } = req.params;
  const { priceUSD } = req.body;
  const price = await Price.findByIdAndUpdate(id, { priceUSD }, { new: true });
  res.json(price);
};
