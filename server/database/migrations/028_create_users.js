const bcrypt = require('bcryptjs');
const crypto = require('crypto');

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

            // Never seed a guessable default credential. Take the initial
            // password from the environment, otherwise generate a random one
            // and print it ONCE to the boot log so the operator can capture it.
            const username = (process.env.SEED_ADMIN_USERNAME || 'admin').trim();
            const fromEnv = Boolean(process.env.SEED_ADMIN_PASSWORD);
            const password = fromEnv
              ? process.env.SEED_ADMIN_PASSWORD
              : crypto.randomBytes(12).toString('base64url');

            const passwordHash = bcrypt.hashSync(password, 10);
            db.run(
              `INSERT INTO users (username, password_hash, full_name, is_full, permissions, force_password_change)
               VALUES (?, ?, ?, 1, '{}', 1)`,
              [username, passwordHash, 'System Administrator'],
              (insErr) => {
                if (insErr) return callback(insErr);
                if (fromEnv) {
                  console.log(`Seeded admin user "${username}" from SEED_ADMIN_PASSWORD — change it on first login.`);
                } else {
                  console.log('====================================================================');
                  console.log(` Seeded admin user "${username}" with a one-time random password:`);
                  console.log(`   ${password}`);
                  console.log(' Log in with it now and change it immediately. It will NOT be shown again.');
                  console.log('====================================================================');
                }
                callback(null);
              }
            );
          });
        });
      });
    });
  }
};
