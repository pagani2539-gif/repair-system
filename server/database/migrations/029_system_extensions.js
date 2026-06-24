module.exports = {
  name: '029_system_extensions',
  up: (db, callback) => {
    db.serialize(() => {
      // 1. Generic System Settings (Key-Value)
      db.run(`
        CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return callback(err);

        // Seed default LINE Notify tokens as empty strings
        db.run(`INSERT OR IGNORE INTO system_settings (key, value) VALUES ('line_token_repair', '')`, (err) => {
          if (err) return callback(err);
          
          db.run(`INSERT OR IGNORE INTO system_settings (key, value) VALUES ('line_token_stock', '')`, (err) => {
            if (err) return callback(err);

            // 2. Preventive Maintenance Schedule
            db.run(`
              CREATE TABLE IF NOT EXISTS pm_schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                station_id INTEGER,
                device_name TEXT,
                frequency_months INTEGER DEFAULT 3,
                next_due_date DATE NOT NULL,
                last_performed_date DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (station_id) REFERENCES stations (id) ON DELETE CASCADE
              )
            `, (err) => {
              if (err) return callback(err);

              // 3. Preventive Maintenance Logs
              db.run(`
                CREATE TABLE IF NOT EXISTS pm_logs (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  pm_schedule_id INTEGER,
                  performed_by TEXT NOT NULL,
                  performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  checklist_results TEXT,
                  notes TEXT,
                  status TEXT NOT NULL,
                  image_path TEXT,
                  FOREIGN KEY (pm_schedule_id) REFERENCES pm_schedules (id) ON DELETE CASCADE
                )
              `, (err) => {
                if (err) return callback(err);

                // 4. Alter inventory table to add unit_price and warranty_months
                db.run(`ALTER TABLE inventory ADD COLUMN unit_price REAL DEFAULT 0`, (err) => {
                  // If column already exists, ignore the error and proceed
                  if (err && !err.message.includes('duplicate column')) {
                    return callback(err);
                  }

                  db.run(`ALTER TABLE inventory ADD COLUMN warranty_months INTEGER DEFAULT 36`, (err) => {
                    if (err && !err.message.includes('duplicate column')) {
                      return callback(err);
                    }
                    callback(null);
                  });
                });
              });
            });
          });
        });
      });
    });
  }
};
