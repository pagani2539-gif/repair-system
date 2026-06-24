module.exports = {
  name: '018_add_station_area_id_to_withdrawals',
  up: (db, callback) => {
    db.serialize(() => {
      // 1. Add station_area_id to withdrawals
      db.run(`ALTER TABLE withdrawals ADD COLUMN station_area_id INTEGER REFERENCES station_areas(id) ON DELETE SET NULL`, (err) => {
        if (err && !err.message.includes("duplicate column name")) {
          return callback(err);
        }
        
        // 2. Create index for withdrawals station_area_id
        db.run(`CREATE INDEX IF NOT EXISTS idx_withdrawals_station_area_id ON withdrawals(station_area_id)`, (err) => {
          if (err) console.warn("Warning creating withdrawals station_area_id index:", err.message);

          // 3. Add deleted_at and deleted_by to stations
          db.run(`ALTER TABLE stations ADD COLUMN deleted_at DATETIME`, (err) => {
            if (err && !err.message.includes("duplicate column name")) console.warn("Warning adding deleted_at:", err.message);
            
            db.run(`ALTER TABLE stations ADD COLUMN deleted_by TEXT`, (err) => {
              if (err && !err.message.includes("duplicate column name")) console.warn("Warning adding deleted_by:", err.message);
              
              // 4. Add status to station_areas
              db.run(`ALTER TABLE station_areas ADD COLUMN status INTEGER DEFAULT 1`, (err) => {
                if (err && !err.message.includes("duplicate column name")) console.warn("Warning adding status to station_areas:", err.message);
                
                // 5. Create SQL Views
                db.run(`DROP VIEW IF EXISTS repairs_view`, () => {
                  db.run(`
                    CREATE VIEW repairs_view AS
                    SELECT r.id, r.ticket_no, r.reporter, r.device_name, r.problem, r.priority, r.status, 
                           r.technician, r.repair_note, r.is_read, r.type, r.received_at, r.created_at, r.updated_at, 
                           r.project_name, r.station_id, r.station_area_id,
                           r.location as location_snapshot,
                           COALESCE(s.name, r.location) as location,
                           s.name as station_name,
                           s.code as station_code,
                           s.status as station_status,
                           s.province as station_province,
                           s.region as station_region,
                           sa.name as station_area_name
                    FROM repairs r
                    LEFT JOIN stations s ON r.station_id = s.id
                    LEFT JOIN station_areas sa ON r.station_area_id = sa.id
                  `, (err) => {
                    if (err) return callback(err);
                    
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
                               sa.name as station_area_name
                        FROM withdrawals w
                        LEFT JOIN stations s ON w.station_id = s.id
                        LEFT JOIN station_areas sa ON w.station_area_id = sa.id
                      `, (err) => {
                        if (err) return callback(err);
                        
                        db.run(`DROP VIEW IF EXISTS transactions_view`, () => {
                          db.run(`
                            CREATE VIEW transactions_view AS
                            SELECT t.id, t.inventory_id, t.instance_id, t.transaction_type, t.quantity_added, t.quantity_withdrawn,
                                   t.quantity_borrowed, t.quantity_returned, t.project_name, t.station_id, t.user_name, t.note,
                                   t.withdrawal_id, t.return_image, t.created_at,
                                   t.location as location_snapshot,
                                   COALESCE(s.name, t.location) as location,
                                   s.name as station_name,
                                   s.code as station_code,
                                   s.status as station_status,
                                   i.name as product_name,
                                   i.model as product_model,
                                   inst.serial_number,
                                   inst.condition,
                                   w.type as withdrawal_type,
                                   NULL as station_area_id,
                                   NULL as station_area_name
                            FROM inventory_transactions t
                            JOIN inventory i ON t.inventory_id = i.id
                            LEFT JOIN inventory_instances inst ON t.instance_id = inst.id
                            LEFT JOIN withdrawals w ON t.withdrawal_id = w.id
                            LEFT JOIN stations s ON t.station_id = s.id
                          `, (err) => {
                            if (err) return callback(err);
                            
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
                                       NULL as station_area_name
                                FROM inventory_instances inst
                                LEFT JOIN stations s ON inst.station_id = s.id
                              `, (err) => {
                                callback(err);
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  }
};
