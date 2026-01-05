import cron from 'node-cron';
import { calculateAllProfits } from '../services/profitService.js';

let isRunning = false;
let cronTask = null;

/**
 * Start hourly profit calculation cron
 */
export const startProfitCron = () => {
  if (cronTask) {
    console.log('⚠️ Profit cron already running. Skipping duplicate start.');
    return cronTask;
  }

  cronTask = cron.schedule(
    '0 * * * *', // every hour
    async () => {
      if (isRunning) {
        console.warn('⏳ Previous profit calculation still running. Skipping this cycle.');
        return;
      }

      isRunning = true;
      const timestamp = new Date().toISOString();
      console.log('\n' + '='.repeat(60));
      console.log(`⏰ [${timestamp}] Hourly profit calculation started`);
      console.log('='.repeat(60));

      try {
        const result = await calculateAllProfits();
        console.log(`✅ Profit calculation successful`);
        console.log(`   📊 Investments processed: ${result.processed}`);
        console.log(`   💰 Total profit: ${result.totalProfit.toFixed(8)} USDT`);
      } catch (error) {
        console.error('❌ Profit calculation failed:', error);
      } finally {
        isRunning = false;
        console.log('='.repeat(60) + '\n');
      }
    },
    {
      scheduled: true,
      timezone: 'UTC'
    }
  );

  console.log('✅ Profit calculation cron job started (every hour, UTC)');
  return cronTask;
};

/**
 * Stop profit cron safely (for shutdowns)
 */
export const stopProfitCron = () => {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log('🛑 Profit calculation cron stopped');
  }
};

/**
 * Manual profit calculation trigger
 */
export const triggerProfitCalculation = async () => {
  if (isRunning) {
    throw new Error('Profit calculation already running');
  }

  isRunning = true;
  console.log('🔄 Manual profit calculation triggered');

  try {
    const result = await calculateAllProfits();
    console.log('✅ Manual profit calculation completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Manual profit calculation failed:', error);
    throw error;
  } finally {
    isRunning = false;
  }
};
