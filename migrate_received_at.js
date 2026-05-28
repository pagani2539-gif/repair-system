const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'database', 'repair_system.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run("ALTER TABLE repairs ADD COLUMN received_at DATETIME", (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('Column received_at already exists.');
      } else {
        console.error('Error adding column:', err.message);
      }
    } else {
      console.log('Column received_at added successfully.');
    }
  });
});
db.close();
