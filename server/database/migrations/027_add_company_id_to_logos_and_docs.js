module.exports = {
  name: '027_add_company_id_to_logos_and_docs',
  up: (db, callback) => {
    db.serialize(() => {
      const operations = [
        // Link logos to companies. NULL = shared logo (usable by any company).
        { sql: `ALTER TABLE company_logos ADD COLUMN company_id INTEGER` },

        // Documents: nullable company_id for future audit trail.
        // When set, indicates "this document was issued in the name of this company".
        { sql: `ALTER TABLE withdrawals ADD COLUMN company_id INTEGER` },
        { sql: `ALTER TABLE repairs ADD COLUMN company_id INTEGER` },
        { sql: `ALTER TABLE purchase_orders ADD COLUMN company_id INTEGER` },
      ];

      // Step 1: Apply ALTER statements (tolerate duplicate column errors)
      let i = 0;
      const applyNext = () => {
        if (i >= operations.length) return seedLogos();
        db.run(operations[i].sql, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            return callback(err);
          }
          i++;
          applyNext();
        });
      };

      // Step 2: Backfill existing logos → assign to default company
      const seedLogos = () => {
        db.get(`SELECT id FROM companies WHERE is_default = 1 LIMIT 1`, [], (err, defaultCompany) => {
          if (err) return finalize();
          if (!defaultCompany) return finalize();

          db.run(
            `UPDATE company_logos SET company_id = ? WHERE company_id IS NULL`,
            [defaultCompany.id],
            finalize
          );
        });
      };

      const finalize = () => {
        db.run(`CREATE INDEX IF NOT EXISTS idx_logos_company ON company_logos(company_id)`, () => {
          callback(null);
        });
      };

      applyNext();
    });
  }
};
