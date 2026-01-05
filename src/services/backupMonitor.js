import { getBackupStats, listBackups } from './backupService.js';
import logger from '../config/logger.js';
import transporter from '../config/email.js';

// Check backup health
export const checkBackupHealth = async () => {
  try {
    const stats = await getBackupStats();
    const backups = await listBackups('all');

    const issues = [];

    // Check if backups exist
    if (stats.total === 0) {
      issues.push('No backups found');
    }

    // Check last backup age
    if (stats.newest) {
      const lastBackupDate = new Date(stats.newest);
      const hoursSinceLastBackup =
        (Date.now() - lastBackupDate.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastBackup > 48) {
        issues.push(
          `Last backup is ${Math.round(hoursSinceLastBackup)} hours old`
        );
      }
    }

    // Check backup size trends
    if (backups.length > 1) {
      const latestSize = backups[0].size;
      const previousSize = backups[1].size;

      // Alert if backup size decreased by more than 50%
      if (latestSize < previousSize * 0.5) {
        issues.push('Latest backup size significantly smaller than previous');
      }
    }

    const health = {
      healthy: issues.length === 0,
      issues,
      stats,
      checkedAt: new Date().toISOString()
    };

    if (!health.healthy) {
      logger.warn('Backup health check failed', { issues });

      // Send alert email if configured
      if (process.env.BACKUP_ALERT_EMAIL) {
        await sendBackupAlert(issues);
      }
    } else {
      logger.info('Backup health check passed');
    }

    return health;
  } catch (error) {
    logger.error('Backup health check failed', error);
    throw error;
  }
};

// Send backup alert email
export const sendBackupAlert = async (issues) => {
  try {
    const mailOptions = {
      from: `"ADEX Trade Alerts" <${process.env.EMAIL_FROM}>`,
      to: process.env.BACKUP_ALERT_EMAIL,
      subject: '⚠️ ADEX Trade - Backup System Alert',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2 style="color: #ff6b6b;">Backup System Alert</h2>
          <p>The following issues were detected with the backup system:</p>
          <ul>
            ${issues.map(issue => `<li>${issue}</li>`).join('')}
          </ul>
          <p><strong>Action Required:</strong> Please investigate immediately.</p>
          <p><small>Time: ${new Date().toLocaleString()}</small></p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info('Backup alert email sent');
  } catch (error) {
    logger.error('Failed to send backup alert email', error);
  }
};
