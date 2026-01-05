import cron from 'node-cron';
import { createBackup, cleanupOldBackups } from '../services/backupService.js';
import logger from '../config/logger.js';
import { checkBackupHealth } from '../services/backupMonitor.js';

// Start backup scheduler
export const startBackupScheduler = () => {
  // Daily backup at 2 AM UTC
  const dailyBackupTask = cron.schedule('0 2 * * *', async () => {
    const timestamp = new Date().toISOString();
    logger.info(`${'='.repeat(60)}`);
    logger.info(`⏰ [${timestamp}] Starting scheduled daily backup...`);
    logger.info(`${'='.repeat(60)}`);

    try {
      const result = await createBackup('daily', 'Automated daily backup');
      logger.info('✅ Daily backup completed successfully', {
        filename: result.filename,
        size: result.sizeFormatted
      });
    } catch (error) {
      logger.error('❌ Daily backup failed:', error);
    }

    logger.info(`${'='.repeat(60)}\n`);
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  // Cleanup old backups weekly (Sunday at 3 AM UTC)
  const cleanupTask = cron.schedule('0 3 * * 0', async () => {
    logger.info('⏰ Starting weekly backup cleanup...');

    try {
      const result = await cleanupOldBackups();
      logger.info('✅ Backup cleanup completed', result);
    } catch (error) {
      logger.error('❌ Backup cleanup failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  logger.info('✅ Backup scheduler started');
  logger.info('   - Daily backups: 2:00 AM UTC');
  logger.info('   - Weekly cleanup: Sunday 3:00 AM UTC');

  return { dailyBackupTask, cleanupTask };
};

// Manual trigger for testing
export const triggerBackupNow = async (type = 'manual', description = 'Manual backup') => {
  logger.info('🔄 Manually triggering backup...');
  try {
    const result = await createBackup(type, description);
    logger.info('✅ Manual backup completed:', result);
    return result;
  } catch (error) {
    logger.error('❌ Manual backup failed:', error);
    throw error;
  }
};
// Backup health check (runs daily at 8 AM UTC)
export const healthCheckTask = cron.schedule(
  '0 8 * * *',
  async () => {
    logger.info('⏰ Running backup health check...');

    try {
      const health = await checkBackupHealth();

      if (health.healthy) {
        logger.info('✅ Backup system is healthy');
      } else {
        logger.warn('⚠️ Backup system has issues', {
          issues: health.issues
        });
      }
    } catch (error) {
      logger.error('❌ Health check failed', error);
    }
  },
  {
    scheduled: true,
    timezone: 'UTC'
  }
);
