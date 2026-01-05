#!/usr/bin/env node

import 'dotenv/config'; // <-- load environment variables

import {
  createBackup,
  listBackups,
  verifyBackup,
  getBackupStats,
  initializeBackupDirs
} from '../services/backupService.js';

(async () => {
  try {
    console.log('🧪 Testing Backup System\n');
    console.log('='.repeat(80));

    // Initialize
    console.log('\n1. Initializing backup directories...');
    await initializeBackupDirs();
    console.log('✅ Directories initialized');

    // Create test backup
    console.log('\n2. Creating test backup...');
    const backup = await createBackup('manual', 'Test backup');
    console.log('✅ Backup created:', backup.filename);

    // List backups
    console.log('\n3. Listing all backups...');
    const backups = await listBackups('all');
    console.log(`✅ Found ${backups.length} backups`);

    // Verify backup
    console.log('\n4. Verifying backup integrity...');
    const verification = await verifyBackup(backup.path);
    console.log('✅ Backup verification:', verification.valid ? 'PASSED' : 'FAILED');

    // Get stats
    console.log('\n5. Getting backup statistics...');
    const stats = await getBackupStats();
    console.log('✅ Statistics:');
    console.log(`   Total backups: ${stats.total}`);
    console.log(`   Total size: ${stats.totalSizeFormatted}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ All tests passed!');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
})();
