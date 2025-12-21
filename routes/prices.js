import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// Get live prices for BNB, BTC, ETH, USDT
router.get("/", async (req, res) => {
  try {
    const coins = ["binancecoin", "bitcoin", "ethereum", "tether"];
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coins.join(",")}&vs_currencies=usd`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
