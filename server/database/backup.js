const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, 'backups');
const MAX_BACKUPS = 10;

/**
 * Perform a database backup using SQLite's VACUUM INTO command.
 * This is non-blocking and safe even if transactions are active.
 * @param {import('sqlite3').Database} db 
 * @returns {Promise<string>} Path to the created backup file
 */
const runBackup = (db) => {
  return new Promise((resolve, reject) => {
    try {
      // 1. Ensure backup directory exists
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
      }

      // 2. Format timestamp for filename
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const date = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const timestamp = `${year}${month}${date}_${hours}${minutes}${seconds}`;
      
      const backupPath = path.join(BACKUP_DIR, `backup_${timestamp}.db`);

      console.log(`Starting database backup to: ${backupPath}`);

      // 3. Execute SQLite VACUUM INTO
      // We escape the path by replacing backslashes with forward slashes for SQLite compatibility on Windows
      const normalizedPath = backupPath.replace(/\\/g, '/');
      db.run(`VACUUM INTO '${normalizedPath}'`, (err) => {
        if (err) {
          console.error('Database backup failed:', err.message);
          return reject(err);
        }

        console.log(`Database backup completed successfully: ${backupPath}`);
        
        // 4. Clean up old backups
        cleanOldBackups()
          .then(() => resolve(backupPath))
          .catch((cleanErr) => {
            console.error('Old backups cleanup failed:', cleanErr.message);
            resolve(backupPath); // Still resolve because backup succeeded
          });
      });
    } catch (error) {
      console.error('Backup manager error:', error.message);
      reject(error);
    }
  });
};

/**
 * Delete older backup files to keep only the latest MAX_BACKUPS.
 */
const cleanOldBackups = () => {
  return new Promise((resolve, reject) => {
    fs.readdir(BACKUP_DIR, (err, files) => {
      if (err) return reject(err);

      // Filter to only match database backup files
      const backupFiles = files
        .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
        .map(f => ({
          name: f,
          path: path.join(BACKUP_DIR, f),
          time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs
        }))
        // Sort newest first
        .sort((a, b) => b.time - a.time);

      if (backupFiles.length > MAX_BACKUPS) {
        const filesToDelete = backupFiles.slice(MAX_BACKUPS);
        console.log(`Cleaning up ${filesToDelete.length} old backup files...`);
        
        filesToDelete.forEach(file => {
          fs.unlink(file.path, (unlinkErr) => {
            if (unlinkErr) {
              console.error(`Failed to delete old backup ${file.name}:`, unlinkErr.message);
            } else {
              console.log(`Deleted old backup: ${file.name}`);
            }
          });
        });
      }
      resolve();
    });
  });
};

/**
 * Schedule automated periodic backups.
 * Runs once immediately, then schedules every 24 hours.
 * @param {import('sqlite3').Database} db 
 */
const scheduleBackups = (db) => {
  // Run a backup immediately on startup
  runBackup(db)
    .catch(err => console.error('Initial startup database backup failed:', err.message));

  // Schedule to run every 24 hours (24 * 60 * 60 * 1000 ms)
  const intervalMs = 24 * 60 * 60 * 1000;
  setInterval(() => {
    console.log('Running scheduled daily database backup...');
    runBackup(db).catch(err => console.error('Scheduled database backup failed:', err.message));
  }, intervalMs);

  console.log('Automated database backup scheduler started (Interval: 24h)');
};

module.exports = {
  runBackup,
  scheduleBackups
};
