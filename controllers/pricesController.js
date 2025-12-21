import axios from "axios";

// Get prices for selected coins
export const getPrices = async (req, res) => {
  try {
    // Example using CoinGecko API
    const coins = ["bitcoin", "ethereum", "binancecoin", "tether"];
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coins.join(
        ","
      )}&vs_currencies=usd`
    );

    res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error("Error fetching prices:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
