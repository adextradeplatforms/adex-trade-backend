#!/usr/bin/env node

/**
 * Manual backup CLI script
 * Runs database backup using backupService
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  createBackup,
  initializeBackupDirs
} from '../services/backupService.js';

// Load .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

(async () => {
  try {
    console.log('📦 Initializing backup directories...');
    await initializeBackupDirs();

    console.log('🔄 Creating database backup...');
    const result = await createBackup('manual', 'Manual CLI backup');

    console.log('\n✅ Backup created successfully!');
    console.log(`📄 File: ${result.filename}`);
    console.log(`📏 Size: ${result.sizeFormatted}`);
    console.log(`📂 Path: ${result.path}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Backup failed!');
    console.error(error.message || error);
    process.exit(1);
  }
})();
