const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'repair_system.db');
console.log('Connecting to db:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  }
});

const tables = ['users', 'stations', 'station_areas', 'inventory', 'inventory_instances', 'withdrawals', 'withdrawal_items', 'repairs', 'inventory_transactions', 'purchase_orders', 'purchase_order_items'];

db.serialize(() => {
  tables.forEach(table => {
    db.get(`SELECT COUNT(*) as count FROM ${table}`, [], (err, row) => {
      if (err) {
        console.error(`Error querying table ${table}:`, err.message);
      } else {
        console.log(`Table ${table}: ${row.count} rows`);
      }
    });
  });
});

db.close();
