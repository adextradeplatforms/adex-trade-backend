#!/usr/bin/env node

import { listBackups, getBackupStats } from '../services/backupService.js';

(async () => {
  try {
    console.log('📂 Listing backups...\n');

    const backups = await listBackups('all');

    if (backups.length === 0) {
      console.log('⚠️ No backups found');
      process.exit(0);
    }

    backups.forEach((backup, index) => {
      console.log(`${index + 1}. ${backup.filename}`);
      console.log(`   Type: ${backup.type}`);
      console.log(`   Size: ${backup.sizeFormatted}`);
      console.log(`   Created: ${backup.created}`);
      console.log(`   Path: ${backup.path}\n`);
    });

    const stats = await getBackupStats();

    console.log('📊 Backup Statistics');
    console.log('-------------------');
    console.log(`Total backups: ${stats.total}`);
    console.log(`Daily backups: ${stats.daily}`);
    console.log(`Manual backups: ${stats.manual}`);
    console.log(`Total size: ${stats.totalSizeFormatted}`);
    console.log(`Newest backup: ${stats.newest}`);
    console.log(`Oldest backup: ${stats.oldest}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to list backups:', error);
    process.exit(1);
  }
})();
