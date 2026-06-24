module.exports = {
  name: '036_create_contracts',
  up: (db, callback) => {
    const ignorable = (err) =>
      !err ||
      err.message.includes('duplicate column name') ||
      err.message.includes('already exists');

    db.serialize(() => {
      // 1. Create contracts table (mirror stations: managed entity + soft delete)
      db.run(`
        CREATE TABLE IF NOT EXISTS contracts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          contract_no TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          year_be INTEGER NOT NULL,
          company_id INTEGER,
          start_date TEXT,
          end_date TEXT,
          note TEXT,
          status INTEGER DEFAULT 1,
          deleted_at DATETIME,
          deleted_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
        )
      `, (err) => {
        if (err) return callback(err);

        // 2. Add contract_id to the three tables (+ indexes)
        db.run(`ALTER TABLE withdrawals ADD COLUMN contract_id INTEGER REFERENCES contracts(id) ON DELETE SET NULL`, (e1) => {
          if (!ignorable(e1)) return callback(e1);
          db.run(`ALTER TABLE inventory_instances ADD COLUMN contract_id INTEGER REFERENCES contracts(id) ON DELETE SET NULL`, (e2) => {
            if (!ignorable(e2)) return callback(e2);
            db.run(`ALTER TABLE inventory_transactions ADD COLUMN contract_id INTEGER REFERENCES contracts(id) ON DELETE SET NULL`, (e3) => {
              if (!ignorable(e3)) return callback(e3);

              db.run(`CREATE INDEX IF NOT EXISTS idx_withdrawals_contract_id ON withdrawals(contract_id)`, () => {
                db.run(`CREATE INDEX IF NOT EXISTS idx_inventory_instances_contract_id ON inventory_instances(contract_id)`, () => {
                  db.run(`CREATE INDEX IF NOT EXISTS idx_inventory_transactions_contract_id ON inventory_transactions(contract_id)`, () => {
                    recreateViews();
                  });
                });
              });
            });
          });
        });
      });

      // 3. Recreate the three views to expose contract fields.
      //    Definitions copied from the LATEST migration that touched each view:
      //    withdrawals_view + inventory_instances_view -> 018, transactions_view -> 031.
      function recreateViews() {
        db.run(`DROP VIEW IF EXISTS withdrawals_view`, () => {
          db.run(`
            CREATE VIEW withdrawals_view AS
            SELECT w.id, w.recipient, w.type, w.note, w.project_name, w.created_at, w.station_id, w.station_area_id,
                   w.location as location_snapshot,
                   COALESCE(s.name, w.location) as location,
                   s.name as station_name,
                   s.code as station_code,
                   s.status as station_status,
                   s.province as station_province,
                   s.region as station_region,
                   sa.name as station_area_name,
                   w.return_due_date,
                   w.contract_id,
                   c.contract_no,
                   c.name as contract_name,
                   c.year_be as contract_year
            FROM withdrawals w
            LEFT JOIN stations s ON w.station_id = s.id
            LEFT JOIN station_areas sa ON w.station_area_id = sa.id
            LEFT JOIN contracts c ON w.contract_id = c.id
          `, (errW) => {
            if (errW) return callback(errW);

            db.run(`DROP VIEW IF EXISTS transactions_view`, () => {
              db.run(`
                CREATE VIEW transactions_view AS
                SELECT t.id, t.inventory_id, t.instance_id, t.transaction_type, t.quantity_added, t.quantity_withdrawn,
                       t.quantity_borrowed, t.quantity_returned, t.project_name, t.station_id, t.user_name, t.note,
                       t.withdrawal_id, t.return_image, t.created_at, t.status,
                       t.location as location_snapshot,
                       COALESCE(s.name, t.location) as location,
                       s.name as station_name,
                       s.code as station_code,
                       s.status as station_status,
                       s.province as station_province,
                       i.name as product_name,
                       i.model as product_model,
                       inst.serial_number,
                       inst.condition,
                       w.type as withdrawal_type,
                       w.return_due_date,
                       w.station_area_id,
                       sa.name as station_area_name,
                       t.contract_id,
                       c.contract_no,
                       c.name as contract_name,
                       c.year_be as contract_year
                FROM inventory_transactions t
                JOIN inventory i ON t.inventory_id = i.id
                LEFT JOIN inventory_instances inst ON t.instance_id = inst.id
                LEFT JOIN withdrawals w ON t.withdrawal_id = w.id
                LEFT JOIN stations s ON t.station_id = s.id
                LEFT JOIN station_areas sa ON w.station_area_id = sa.id
                LEFT JOIN contracts c ON t.contract_id = c.id
              `, (errT) => {
                if (errT) return callback(errT);

                db.run(`DROP VIEW IF EXISTS inventory_instances_view`, () => {
                  db.run(`
                    CREATE VIEW inventory_instances_view AS
                    SELECT inst.id, inst.inventory_id, inst.serial_number, inst.condition, inst.status, inst.created_at, inst.updated_at, inst.station_id,
                           inst.current_location as location_snapshot,
                           COALESCE(s.name, inst.current_location) as location,
                           s.name as station_name,
                           s.code as station_code,
                           s.status as station_status,
                           NULL as station_area_id,
                           NULL as station_area_name,
                           inst.contract_id,
                           c.contract_no,
                           c.name as contract_name,
                           c.year_be as contract_year
                    FROM inventory_instances inst
                    LEFT JOIN stations s ON inst.station_id = s.id
                    LEFT JOIN contracts c ON inst.contract_id = c.id
                  `, (errI) => {
                    callback(errI);
                  });
                });
              });
            });
          });
        });
      }
    });
  }
};
