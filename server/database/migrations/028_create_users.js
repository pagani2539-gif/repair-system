const bcrypt = require('bcryptjs');

module.exports = {
  name: '028_create_users',
  up: (db, callback) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          full_name TEXT NOT NULL,
          is_full INTEGER NOT NULL DEFAULT 0,
          permissions TEXT NOT NULL DEFAULT '{}',
          force_password_change INTEGER NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          password_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME,
          created_by INTEGER REFERENCES users(id),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return callback(err);

        db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)`, (idxErr) => {
          if (idxErr) console.warn('Warning creating users index:', idxErr.message);

          // Seed default admin if no users exist
          db.get('SELECT COUNT(*) as cnt FROM users', [], (cntErr, row) => {
            if (cntErr) return callback(cntErr);
            if (row && row.cnt > 0) return callback(null);

            const passwordHash = bcrypt.hashSync('admin', 10);
            db.run(
              `INSERT INTO users (username, password_hash, full_name, is_full, permissions, force_password_change)
               VALUES (?, ?, ?, 1, '{}', 1)`,
              ['admin', passwordHash, 'System Administrator'],
              (insErr) => {
                if (insErr) return callback(insErr);
                console.log('Seeded default admin (username: admin, password: admin) — please change on first login');
                callback(null);
              }
            );
          });
        });
      });
    });
  }
};
