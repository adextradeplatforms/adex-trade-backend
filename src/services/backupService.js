import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';
import logger from '../config/logger.js';

const execAsync = promisify(exec);

/* ================= BACKUP CONFIG ================= */

export const BACKUP_CONFIG = {
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
  backupDir: path.join(process.cwd(), 'backups'),
  dailyDir: path.join(process.cwd(), 'backups', 'daily'),
  manualDir: path.join(process.cwd(), 'backups', 'manual'),
  archiveDir: path.join(process.cwd(), 'backups', 'archives'),
  compress: process.env.BACKUP_COMPRESS !== 'false'
};

/* ================= INIT DIRS ================= */

export const initializeBackupDirs = async () => {
  await fs.mkdir(BACKUP_CONFIG.backupDir, { recursive: true });
  await fs.mkdir(BACKUP_CONFIG.dailyDir, { recursive: true });
  await fs.mkdir(BACKUP_CONFIG.manualDir, { recursive: true });
  await fs.mkdir(BACKUP_CONFIG.archiveDir, { recursive: true });
  logger.info('Backup directories initialized');
};

/* ================= HELPERS ================= */

export const generateBackupFilename = (type = 'daily') => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const dbName = process.env.DB_NAME || 'adex_trade_db';
  return `${dbName}_${type}_${timestamp}.sql`;
};

export const formatBytes = (bytes) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const compressBackup = async (inputPath) => {
  const outputPath = `${inputPath}.gz`;
  await pipeline(
    createReadStream(inputPath),
    createGzip({ level: 9 }),
    createWriteStream(outputPath)
  );
  await fs.unlink(inputPath);
  return outputPath;
};

/* ================= CREATE BACKUP ================= */

export const createBackup = async (type = 'daily', description = '') => {
  try {
    logger.info(`Starting ${type} database backup...`);

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }

    const dbUrl = new URL(process.env.DATABASE_URL);

    const filename = generateBackupFilename(type);
    const targetDir = type === 'manual' ? BACKUP_CONFIG.manualDir : BACKUP_CONFIG.dailyDir;
    const rawPath = path.join(targetDir, filename);

    const pgDumpCmd = `
PGPASSWORD="${dbUrl.password}" pg_dump \
-h ${dbUrl.hostname} \
-p ${dbUrl.port || 5432} \
-U ${dbUrl.username} \
-d ${dbUrl.pathname.replace('/', '')} \
-F p \
-f "${rawPath}"
`;

    await execAsync(pgDumpCmd, { maxBuffer: 1024 * 1024 * 50 });

    let finalPath = rawPath;
    let compressed = false;

    if (BACKUP_CONFIG.compress) {
      finalPath = await compressBackup(rawPath);
      compressed = true;
    }

    const stats = await fs.stat(finalPath);

    const metadata = {
      filename: path.basename(finalPath),
      type,
      description,
      created: new Date().toISOString(),
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      compressed,
      database: dbUrl.pathname.replace('/', ''),
      path: finalPath
    };

    await fs.writeFile(`${finalPath}.json`, JSON.stringify(metadata, null, 2));

    /* ===== OPTIONAL S3 UPLOAD ===== */
    if (process.env.ENABLE_S3_BACKUP === 'true') {
      try {
        const { uploadToS3 } = await import('./remoteBackupService.js');
        await uploadToS3(finalPath);
        metadata.s3Uploaded = true;
        logger.info(`Backup also uploaded to S3: ${metadata.filename}`);
      } catch (error) {
        logger.error('Failed to upload to S3:', error);
        metadata.s3Uploaded = false;
      }
    }

    logger.info('Backup completed successfully', {
      filename: metadata.filename,
      size: metadata.sizeFormatted,
      type: metadata.type
    });

    return metadata;
  } catch (error) {
    logger.error('Backup creation failed:', error);
    throw error;
  }
};

/* ================= RESTORE BACKUP ================= */

export const restoreBackup = async (backupPath) => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const dbUrl = new URL(process.env.DATABASE_URL);
  let sqlPath = backupPath;

  if (backupPath.endsWith('.gz')) {
    sqlPath = backupPath.replace('.gz', '');
    await pipeline(
      createReadStream(backupPath),
      createGunzip(),
      createWriteStream(sqlPath)
    );
  }

  const restoreCmd = `
PGPASSWORD="${dbUrl.password}" psql \
-h ${dbUrl.hostname} \
-p ${dbUrl.port || 5432} \
-U ${dbUrl.username} \
-d ${dbUrl.pathname.replace('/', '')} \
-f "${sqlPath}"
`;

  await execAsync(restoreCmd, { maxBuffer: 1024 * 1024 * 50 });

  if (backupPath.endsWith('.gz')) {
    await fs.unlink(sqlPath);
  }

  return { success: true };
};

/* ================= LIST & STATS ================= */

export const listBackups = async (type = 'all') => {
  const dirs =
    type === 'all'
      ? [BACKUP_CONFIG.dailyDir, BACKUP_CONFIG.manualDir]
      : [type === 'manual' ? BACKUP_CONFIG.manualDir : BACKUP_CONFIG.dailyDir];

  const backups = [];

  for (const dir of dirs) {
    const files = await fs.readdir(dir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const metadata = JSON.parse(await fs.readFile(path.join(dir, file), 'utf-8'));
        backups.push(metadata);
      }
    }
  }

  backups.sort((a, b) => new Date(b.created) - new Date(a.created));
  return backups;
};

export const getBackupStats = async () => {
  const backups = await listBackups('all');
  const stats = {
    total: backups.length,
    daily: backups.filter(b => b.type === 'daily').length,
    manual: backups.filter(b => b.type === 'manual').length,
    totalSize: backups.reduce((sum, b) => sum + b.size, 0),
    oldest: backups.length ? backups[backups.length - 1].created : null,
    newest: backups.length ? backups[0].created : null
  };
  return { ...stats, totalSizeFormatted: formatBytes(stats.totalSize), retentionDays: BACKUP_CONFIG.retentionDays };
};

/* ================= CLEANUP ================= */

export const cleanupOldBackups = async () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - BACKUP_CONFIG.retentionDays);

  let deletedCount = 0;
  let freedSpace = 0;

  const dirs = [BACKUP_CONFIG.dailyDir, BACKUP_CONFIG.manualDir];

  for (const dir of dirs) {
    const files = await fs.readdir(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await fs.stat(filePath);
      if (stats.mtime < cutoff) {
        await fs.unlink(filePath);
        deletedCount++;
        freedSpace += stats.size;
        logger.info(`Deleted old backup: ${file}`);
      }
    }
  }

  return { deletedCount, freedSpace: formatBytes(freedSpace) };
};

/* ================= VERIFY ================= */

export const verifyBackup = async (backupPath) => {
  let sqlPath = backupPath;

  if (backupPath.endsWith('.gz')) {
    sqlPath = backupPath.replace('.gz', '') + '.temp';
    await pipeline(createReadStream(backupPath), createGunzip(), createWriteStream(sqlPath));
  }

  const content = await fs.readFile(sqlPath, 'utf-8');

  const checks = {
    hasContent: content.length > 0,
    hasHeader: content.includes('PostgreSQL database dump'),
    hasTableCreation: content.includes('CREATE TABLE'),
    hasData: content.includes('INSERT INTO') || content.includes('COPY'),
    fileSize: (await fs.stat(sqlPath)).size
  };

  if (backupPath.endsWith('.gz')) {
    await fs.unlink(sqlPath);
  }

  const valid = checks.hasContent && checks.hasHeader && checks.hasTableCreation && checks.hasData;

  return { valid, checks };
};
