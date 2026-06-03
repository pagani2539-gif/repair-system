module.exports = {
  name: '011_create_purchase_orders',
  up: (db, callback) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS purchase_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          po_no TEXT UNIQUE NOT NULL,
          status TEXT DEFAULT 'Draft', -- Draft, Pending, Approved, Received, Cancelled
          created_by TEXT DEFAULT 'System',
          note TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err1) => {
        if (err1) return callback(err1);

        db.run(`
          CREATE TABLE IF NOT EXISTS purchase_order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            po_id INTEGER NOT NULL,
            inventory_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL DEFAULT 0,
            received_quantity INTEGER DEFAULT 0,
            FOREIGN KEY (po_id) REFERENCES purchase_orders (id) ON DELETE CASCADE,
            FOREIGN KEY (inventory_id) REFERENCES inventory (id) ON DELETE CASCADE
          )
        `, callback);
      });
    });
  }
};
