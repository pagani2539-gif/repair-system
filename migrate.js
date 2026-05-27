const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'database', 'repair_system.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run("ALTER TABLE repairs ADD COLUMN is_read INTEGER DEFAULT 0", (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('Column is_read already exists.');
      } else {
        console.error('Error adding column:', err.message);
      }
    } else {
      console.log('Column is_read added successfully.');
    }
  });
});
db.close();
