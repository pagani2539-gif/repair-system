const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { runMigrations } = require('./migrationRunner');
const { scheduleBackups } = require('./backup');

const dbPath = path.join(__dirname, 'repair_system.db');
const db = new sqlite3.Database(dbPath);

// Enable Foreign Key support
db.run("PRAGMA foreign_keys = ON;");

console.log('Initializing database...');

db.serialize(() => {
  // Create Tables
  db.run(`
    CREATE TABLE IF NOT EXISTS repairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_no TEXT UNIQUE,
      reporter TEXT,
      location TEXT,
      device_name TEXT,
      problem TEXT,
      priority TEXT DEFAULT 'ปกติ',
      status TEXT DEFAULT 'รอดำเนินการ',
      technician TEXT,
      repair_note TEXT,
      is_read INTEGER DEFAULT 0,
      type TEXT DEFAULT 'repair',
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS repair_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repair_id INTEGER,
      action TEXT,
      user TEXT,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (repair_id) REFERENCES repairs (id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS device_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repair_id INTEGER,
      old_serial TEXT,
      old_model TEXT,
      new_serial TEXT,
      new_model TEXT,
      changed_by TEXT,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (repair_id) REFERENCES repairs (id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS repair_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repair_id INTEGER,
      file_path TEXT,
      image_type TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (repair_id) REFERENCES repairs (id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      model TEXT,
      description TEXT,
      quantity INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 10,
      requires_sn INTEGER DEFAULT 1,
      image_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient TEXT NOT NULL,
      type TEXT NOT NULL, -- ติดตั้งใหม่, สำรองใช้งาน, ทดสอบ
      note TEXT,
      project_name TEXT,
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS withdrawal_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      withdrawal_id INTEGER,
      inventory_id INTEGER,
      quantity INTEGER NOT NULL,
      FOREIGN KEY (withdrawal_id) REFERENCES withdrawals (id) ON DELETE CASCADE,
      FOREIGN KEY (inventory_id) REFERENCES inventory (id)
    )
  `);

  console.log('Baseline database tables created or verified successfully.');

  // Run migrations and then start backups
  runMigrations(db)
    .then(() => {
      scheduleBackups(db);
    })
    .catch(err => {
      console.error('CRITICAL: Migration runner failed. Terminating process.', err);
      process.exit(1);
    });
});

module.exports = db;
