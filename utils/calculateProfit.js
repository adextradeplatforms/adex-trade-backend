export const calculateProfit = (capital, dailyPercent, startTime) => {
  const now = new Date();
  const start = new Date(startTime);

  const diffMs = now - start;
  const diffHours = diffMs / (1000 * 60 * 60);

  const hourlyPercent = dailyPercent / 24;
  const profit = capital * (hourlyPercent / 100) * diffHours;

  return Number(profit.toFixed(2));
};
