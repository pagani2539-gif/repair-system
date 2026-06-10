module.exports = {
  name: '026_companies_multi',
  up: (db, callback) => {
    db.serialize(() => {
      // Step 1: Create new `companies` table (multi-row capable)
      db.run(`
        CREATE TABLE IF NOT EXISTS companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name_th TEXT NOT NULL,
          name_en TEXT,
          name_short TEXT,
          address TEXT,
          phone TEXT,
          email TEXT,
          tax_id TEXT,
          website TEXT,
          is_default INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return callback(err);

        // Step 2: Migrate existing data from `company_info` (single row) → `companies`
        db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='company_info'`, [], (err2, row) => {
          if (err2) return callback(err2);

          const finalize = () => {
            db.run(`CREATE INDEX IF NOT EXISTS idx_companies_default ON companies(is_default)`, (idxErr) => {
              if (idxErr) console.warn('Warning creating companies index:', idxErr.message);
              callback(null);
            });
          };

          if (!row) {
            // No legacy table — just seed one default company
            db.run(
              `INSERT INTO companies (name_th, name_en, is_default) VALUES (?, ?, 1)`,
              ['บริษัท [ชื่อบริษัทของคุณ] จำกัด', 'Your Company Co., Ltd.'],
              finalize
            );
            return;
          }

          // Copy data from company_info
          db.get(`SELECT COUNT(*) as cnt FROM companies`, [], (err3, countRow) => {
            if (err3) return callback(err3);
            if (countRow && countRow.cnt > 0) return finalize(); // Already migrated

            db.get(`SELECT * FROM company_info WHERE id = 1`, [], (err4, oldRow) => {
              if (err4) return callback(err4);
              if (!oldRow) {
                // Empty legacy table — seed default
                db.run(
                  `INSERT INTO companies (name_th, name_en, is_default) VALUES (?, ?, 1)`,
                  ['บริษัท [ชื่อบริษัทของคุณ] จำกัด', 'Your Company Co., Ltd.'],
                  finalize
                );
                return;
              }

              db.run(
                `INSERT INTO companies (id, name_th, name_en, address, phone, email, tax_id, website, is_default)
                 VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                [
                  oldRow.name_th || '',
                  oldRow.name_en || '',
                  oldRow.address || '',
                  oldRow.phone || '',
                  oldRow.email || '',
                  oldRow.tax_id || '',
                  oldRow.website || ''
                ],
                (err5) => {
                  if (err5) return callback(err5);
                  // Drop legacy table after successful migration
                  db.run(`DROP TABLE IF EXISTS company_info`, finalize);
                }
              );
            });
          });
        });
      });
    });
  }
};
