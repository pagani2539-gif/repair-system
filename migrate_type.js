const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('server/database/repair_system.db');

db.serialize(() => {
  db.run("ALTER TABLE repairs ADD COLUMN type TEXT DEFAULT 'repair'", (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('Column type already exists.');
      } else {
        console.error('Error adding column:', err.message);
      }
    } else {
      console.log('Column type added successfully.');
    }
  });
});
db.close();
