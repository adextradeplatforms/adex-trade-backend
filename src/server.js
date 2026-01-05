// src/server.js
import app from './app.js';
import pool from './config/database.js';
import { initializeBackupDirs } from './services/backupService.js';
import { startBackupScheduler } from './cron/backupScheduler.js';
import { startProfitCron } from './cron/profitCalculation.js';
import { initializeBlockchain, startDepositListener } from './services/blockchainService.js';

const PORT = process.env.PORT || 3000;

// ================= GLOBAL ERROR HANDLING =================
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

// ================= ASYNC SERVER START =================
const startServer = async () => {
  try {
    // -------- DATABASE CONNECTION TEST --------
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Database connected at:', res.rows[0].now);

    // -------- PROFIT CRON --------
    startProfitCron();
    console.log('⏱️ Profit calculation cron job started');

    // -------- BACKUP SYSTEM --------
    await initializeBackupDirs();
    console.log('✅ Backup directories initialized');

    if (process.env.ENABLE_AUTO_BACKUP !== 'false') {
      startBackupScheduler();
      console.log('⏱️ Backup scheduler started');
    } else {
      console.log('⏸️ Auto-backup scheduler disabled');
    }

    // -------- BLOCKCHAIN SERVICE --------
    await initializeBlockchain();
    startDepositListener();
    console.log('👂 USDT deposit listener started');

    // -------- AUTO-WITHDRAWAL (DISABLED) --------
    console.log('⏸️ Auto-withdrawal scheduler is disabled');

    // -------- START SERVER --------
    const server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║     🚀 ADEX TRADE API SERVER 🚀        ║
║  Server running on port: ${PORT}      ║
║  Environment: ${process.env.NODE_ENV || 'development'} ║
║  API: http://localhost:${PORT}         ║
║  Health: http://localhost:${PORT}/health ║
╚════════════════════════════════════════╝
      `);
    });

    // -------- GRACEFUL SHUTDOWN --------
    const shutdown = () => {
      console.log('🛑 Signal received: closing HTTP server');
      server.close(() => {
        console.log('✅ HTTP server closed');
        pool.end(() => {
          console.log('✅ Database pool closed');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('❌ Server startup failed:', err);
    process.exit(1);
  }
};

// Start the server
startServer();
