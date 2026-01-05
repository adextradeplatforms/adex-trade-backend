# ADEX Trade – Database Backup System

This directory stores all database backups for the ADEX Trade platform.
Backup files are automatically ignored by Git for security reasons.

---

## Directory Structure

backups/
├── daily/          Automated daily backups
├── manual/         Manual backups created by admins
├── archives/       Long-term storage (optional)
├── logs/           Backup operation logs
└── README.md

---

## Backup Schedule

• Daily Backups: 2:00 AM UTC  
• Retention Period: 30 days  
• Cleanup: Every Sunday at 3:00 AM UTC  

Old backups are deleted automatically.

---

## Manual Backup Commands

Create a manual backup:
npm run backup "Optional description"

List all backups:
npm run list-backups

Restore a backup:
npm run restore <filename>

⚠️ Warning:
Restoring a backup will overwrite the current database.

---

## Remote Backup (Optional)

If enabled, backups are uploaded to AWS S3 automatically.

Controlled via .env:
ENABLE_S3_BACKUP=true

---

## Security Notes

• Backup files are not committed to Git
• Access to backup APIs is admin-only
• Backup system logs all actions

---

ADEX Trade Backup System
