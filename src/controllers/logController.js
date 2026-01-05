import fs from 'fs/promises';
import path from 'path';
import logger from '../config/logger.js';

// Get recent logs
export const getLogs = async (req, res) => {
  try {
    const { type = 'combined', lines = 100 } = req.query;

    const logFile = type === 'error' ? 'error.log' : 'combined.log';
    const logPath = path.join('logs', logFile);

    const content = await fs.readFile(logPath, 'utf-8');
    const logLines = content.trim().split('\n');

    const recentLogs = logLines.slice(-parseInt(lines));
    const parsedLogs = recentLogs
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line };
        }
      })
      .reverse();

    res.json({
      success: true,
      data: {
        logs: parsedLogs,
        total: logLines.length,
        type
      }
    });
  } catch (error) {
    logger.error('Get logs error:', error);

    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        message: 'Log file not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch logs'
    });
  }
};

// Download log file
export const downloadLogs = async (req, res) => {
  try {
    const { type = 'combined' } = req.query;
    const logFile = type === 'error' ? 'error.log' : 'combined.log';
    const logPath = path.join('logs', logFile);

    res.download(logPath);
  } catch (error) {
    logger.error('Download logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download logs'
    });
  }
};

// Clear logs (admin only)
export const clearLogs = async (req, res) => {
  try {
    const { type = 'combined' } = req.body;
    const logFile = type === 'error' ? 'error.log' : 'combined.log';
    const logPath = path.join('logs', logFile);

    await fs.writeFile(logPath, ''); // Clear content

    logger.info('Logs cleared by admin', { adminId: req.user.id, logType: type });

    res.json({
      success: true,
      message: 'Logs cleared successfully'
    });
  } catch (error) {
    logger.error('Clear logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear logs'
    });
  }
};

// Get log statistics
export const getLogStats = async (req, res) => {
  try {
    const errorLogPath = path.join('logs', 'error.log');
    const combinedLogPath = path.join('logs', 'combined.log');

    const [errorStats, combinedStats] = await Promise.all([
      fs.stat(errorLogPath).catch(() => null),
      fs.stat(combinedLogPath).catch(() => null)
    ]);

    res.json({
      success: true,
      data: {
        error: errorStats
          ? { size: errorStats.size, modified: errorStats.mtime }
          : null,
        combined: combinedStats
          ? { size: combinedStats.size, modified: combinedStats.mtime }
          : null
      }
    });
  } catch (error) {
    logger.error('Get log stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get log statistics'
    });
  }
};
