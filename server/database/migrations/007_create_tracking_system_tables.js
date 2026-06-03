module.exports = {
  name: '007_create_tracking_system_tables',
  up: (db, callback) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS inventory_instances (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          inventory_id INTEGER NOT NULL,
          serial_number TEXT UNIQUE,
          condition TEXT DEFAULT 'New',
          status TEXT DEFAULT 'In Stock',
          current_location TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (inventory_id) REFERENCES inventory (id) ON DELETE CASCADE
        )
      `, (err1) => {
        if (err1) return callback(err1);
        
        db.run(`
          CREATE TABLE IF NOT EXISTS inventory_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            inventory_id INTEGER NOT NULL,
            instance_id INTEGER,
            transaction_type TEXT NOT NULL,
            quantity_added INTEGER DEFAULT 0,
            quantity_withdrawn INTEGER DEFAULT 0,
            quantity_borrowed INTEGER DEFAULT 0,
            quantity_returned INTEGER DEFAULT 0,
            project_name TEXT,
            location TEXT,
            user_name TEXT,
            note TEXT,
            withdrawal_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (inventory_id) REFERENCES inventory (id) ON DELETE CASCADE,
            FOREIGN KEY (instance_id) REFERENCES inventory_instances (id) ON DELETE SET NULL
          )
        `, callback);
      });
    });
  }
};
