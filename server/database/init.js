const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'repair_system.db');
const db = new sqlite3.Database(dbPath);

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

  console.log('Database tables created successfully.');
});

module.exports = db;
