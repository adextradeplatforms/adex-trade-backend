import path from 'path';
import fs from 'fs/promises';
import {
  createBackup,
  listBackups,
  restoreBackup,
  cleanupOldBackups,
  getBackupStats,
  verifyBackup
} from '../services/backupService.js';
import logger from '../config/logger.js';

// Create manual backup
export const createManualBackup = async (req, res) => {
  try {
    const { description } = req.body;

    logger.info('Manual backup requested', {
      adminId: req.user.id,
      adminEmail: req.user.email
    });

    const result = await createBackup('manual', description || 'Manual backup by admin');

    res.status(201).json({
      success: true,
      message: 'Backup created successfully',
      data: result
    });

  } catch (error) {
    logger.error('Manual backup failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create backup',
      error: error.message
    });
  }
};

// List all backups
export const getAllBackups = async (req, res) => {
  try {
    const { type = 'all' } = req.query;
    const backups = await listBackups(type);

    res.json({
      success: true,
      data: backups
    });

  } catch (error) {
    logger.error('Failed to list backups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list backups'
    });
  }
};

// Download backup file
export const downloadBackup = async (req, res) => {
  try {
    const { filename } = req.params;

    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    const backups = await listBackups('all');
    const backup = backups.find(b => b.filename === filename);

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    logger.info('Backup download requested', {
      filename,
      adminId: req.user.id
    });

    res.download(backup.path, filename);

  } catch (error) {
    logger.error('Backup download failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download backup'
    });
  }
};

// Restore from backup
export const restoreFromBackup = async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing filename'
      });
    }

    const backups = await listBackups('all');
    const backup = backups.find(b => b.filename === filename);

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    logger.warn('Database restoration initiated', {
      filename,
      adminId: req.user.id,
      adminEmail: req.user.email
    });

    const result = await restoreBackup(backup.path);

    logger.info('Database restored successfully', {
      filename,
      adminId: req.user.id
    });

    res.json({
      success: true,
      message: 'Database restored successfully',
      data: result
    });

  } catch (error) {
    logger.error('Database restoration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore database',
      error: error.message
    });
  }
};

// Delete backup
export const deleteBackup = async (req, res) => {
  try {
    const { filename } = req.params;

    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    const backups = await listBackups('all');
    const backup = backups.find(b => b.filename === filename);

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    await fs.unlink(backup.path);
    await fs.unlink(`${backup.path}.json`);

    logger.info('Backup deleted', {
      filename,
      adminId: req.user.id
    });

    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });

  } catch (error) {
    logger.error('Backup deletion failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete backup'
    });
  }
};

// Get backup statistics
export const getStats = async (req, res) => {
  try {
    const stats = await getBackupStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get backup stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get backup statistics'
    });
  }
};

// Verify backup integrity
export const verifyBackupIntegrity = async (req, res) => {
  try {
    const { filename } = req.params;

    if (!filename || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    const backups = await listBackups('all');
    const backup = backups.find(b => b.filename === filename);

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    const result = await verifyBackup(backup.path);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Backup verification failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify backup'
    });
  }
};

// Cleanup old backups
export const cleanup = async (req, res) => {
  try {
    logger.info('Manual cleanup requested', { adminId: req.user.id });

    const result = await cleanupOldBackups();

    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      data: result
    });

  } catch (error) {
    logger.error('Cleanup failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup old backups'
    });
  }
};
