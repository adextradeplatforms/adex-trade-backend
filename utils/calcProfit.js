export const calculateProfit = (investment) => {
  const now = new Date();

  const timeDiffMs = now - investment.lastProfitTime;
  const hours = timeDiffMs / (1000 * 60 * 60);

  const hourlyRate = investment.dailyRate / 24;

  const profit = investment.amount * hourlyRate * hours;

  return profit > 0 ? profit : 0;
};
