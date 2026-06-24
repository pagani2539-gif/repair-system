module.exports = {
  name: '037_create_station_asset_status',
  up: (db, callback) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS station_asset_status (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          station_id INTEGER NOT NULL,
          inventory_id INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'ปกติ',
          note TEXT,
          updated_by TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(station_id, inventory_id),
          FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
          FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err && !err.message.includes('already exists')) {
          return callback(err);
        }
        db.run(
          'CREATE INDEX IF NOT EXISTS idx_sas_station ON station_asset_status(station_id)',
          (err2) => {
            if (err2 && !err2.message.includes('already exists')) {
              return callback(err2);
            }
            callback(null);
          }
        );
      });
    });
  }
};
