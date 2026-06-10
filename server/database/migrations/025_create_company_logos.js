module.exports = {
  name: '025_create_company_logos',
  up: (db, callback) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS company_logos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          label TEXT NOT NULL,
          file_path TEXT NOT NULL,
          is_default INTEGER DEFAULT 0,
          uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return callback(err);

        db.run(`CREATE INDEX IF NOT EXISTS idx_company_logos_default ON company_logos(is_default)`, (err2) => {
          if (err2) console.warn('Warning creating logos index:', err2.message);
          callback(null);
        });
      });
    });
  }
};
