const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Check if the database error is a standard "already exists" error (e.g. duplicate column or table).
 * This allows safe migrations on pre-existing schemas.
 * @param {Error} err 
 * @returns {boolean}
 */
const isAlreadyAppliedError = (err) => {
  if (!err || !err.message) return false;
  const msg = err.message.toLowerCase();
  return msg.includes('duplicate column name') || 
         msg.includes('already exists') || 
         msg.includes('duplicate column');
};

/**
 * Runs the database migrations sequentially.
 * @param {import('sqlite3').Database} db 
 * @returns {Promise<void>}
 */
const runMigrations = (db) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Create the migrations tracking table if it doesn't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          name TEXT PRIMARY KEY,
          run_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Failed to create schema_migrations table:', err.message);
          return reject(err);
        }

        // 2. Fetch already executed migrations
        db.all('SELECT name FROM schema_migrations', [], (err, rows) => {
          if (err) {
            console.error('Failed to fetch executed migrations:', err.message);
            return reject(err);
          }

          const appliedMigrations = new Set(rows.map(r => r.name));

          // 3. Read migration files
          if (!fs.existsSync(MIGRATIONS_DIR)) {
            console.log('Migrations directory not found. Skipping migrations.');
            return resolve();
          }

          fs.readdir(MIGRATIONS_DIR, (err, files) => {
            if (err) {
              console.error('Failed to read migrations directory:', err.message);
              return reject(err);
            }

            // Filter for JS files and sort them alphabetically
            const migrationFiles = files
              .filter(f => f.endsWith('.js'))
              .sort();

            if (migrationFiles.length === 0) {
              console.log('No migration files found.');
              return resolve();
            }

            console.log(`Found ${migrationFiles.length} migration scripts. Running checks...`);
            
            let currentPromise = Promise.resolve();

            migrationFiles.forEach(file => {
              const migrationPath = path.join(MIGRATIONS_DIR, file);
              const migration = require(migrationPath);

              if (!migration.name || typeof migration.up !== 'function') {
                console.warn(`Skipping invalid migration file: ${file}`);
                return;
              }

              if (appliedMigrations.has(migration.name)) {
                // Already run
                return;
              }

              // Chain promises to execute sequentially
              currentPromise = currentPromise.then(() => {
                return new Promise((resolveMigration, rejectMigration) => {
                  console.log(`Executing migration: ${migration.name}...`);
                  
                  migration.up(db, (migrationErr) => {
                    if (migrationErr) {
                      if (isAlreadyAppliedError(migrationErr)) {
                        console.log(`[Historical Check] Migration ${migration.name} already applied (found existing columns/tables). Marking as applied.`);
                      } else {
                        console.error(`Migration ${migration.name} failed:`, migrationErr.message);
                        return rejectMigration(migrationErr);
                      }
                    } else {
                      console.log(`Migration ${migration.name} executed successfully.`);
                    }

                    // Log execution in schema_migrations
                    db.run('INSERT INTO schema_migrations (name) VALUES (?)', [migration.name], (logErr) => {
                      if (logErr) {
                        console.error(`Failed to record migration log for ${migration.name}:`, logErr.message);
                        return rejectMigration(logErr);
                      }
                      resolveMigration();
                    });
                  });
                });
              });
            });

            currentPromise
              .then(() => {
                console.log('Database migration check completed successfully.');
                resolve();
              })
              .catch(reject);
          });
        });
      });
    });
  });
};

module.exports = {
  runMigrations
};
