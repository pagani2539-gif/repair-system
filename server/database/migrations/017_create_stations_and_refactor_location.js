const initialStations = [];

module.exports = {
  name: '017_create_stations_and_refactor_location',
  up: (db, callback) => {
    db.serialize(() => {
      // 1. Create stations table
      db.run(`
        CREATE TABLE IF NOT EXISTS stations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL,
          name TEXT UNIQUE NOT NULL,
          station_type TEXT NOT NULL,
          highway_no TEXT NOT NULL,
          km_post TEXT,
          direction TEXT NOT NULL,
          region TEXT NOT NULL,
          province TEXT NOT NULL,
          status INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return callback(err);

        // 2. Create station_areas table
        db.run(`
          CREATE TABLE IF NOT EXISTS station_areas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            station_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            status INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (station_id) REFERENCES stations (id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) return callback(err);

          // Create index on station_areas
          db.run(`CREATE UNIQUE INDEX IF NOT EXISTS uidx_station_area ON station_areas(station_id, name)`, (err) => {
            if (err) return callback(err);

            // 3. Seed initial stations
            const insertStation = db.prepare(`
              INSERT OR IGNORE INTO stations (code, name, station_type, highway_no, direction, region, province)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            initialStations.forEach((st) => {
              insertStation.run(st.code, st.name, st.type, st.highway, st.dir, st.region, st.prov);
            });

            insertStation.finalize((err) => {
              if (err) return callback(err);

              // Seed some default areas for each station
              db.all("SELECT id FROM stations", [], (err, rows) => {
                if (err) return callback(err);

                const insertArea = db.prepare(`
                  INSERT OR IGNORE INTO station_areas (station_id, name)
                  VALUES (?, ?)
                `);

                const defaultAreas = [
                  'ช่องทางชั่งน้ำหนักหลัก',
                  'ห้องควบคุมระบบคอมพิวเตอร์',
                  'ลูปตรวจจับโลหะ ช่องทางที่ 1',
                  'กล้อง ANPR (ทางเข้า)'
                ];

                rows.forEach((row) => {
                  defaultAreas.forEach((areaName) => {
                    insertArea.run(row.id, areaName);
                  });
                });

                insertArea.finalize((err) => {
                  if (err) return callback(err);

                  // 4. Add columns to related tables (handling duplicates safely)
                  const alterTableAddColumn = (tableName, columnName, definition) => {
                    return new Promise((resolve) => {
                      db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`, (alterErr) => {
                        if (alterErr) {
                          if (alterErr.message.includes('duplicate column name')) {
                            console.log(`Column ${columnName} already exists in ${tableName}.`);
                          } else {
                            console.warn(`Warning altering ${tableName}:`, alterErr.message);
                          }
                        } else {
                          console.log(`Added column ${columnName} to ${tableName}.`);
                        }
                        resolve();
                      });
                    });
                  };

                  Promise.all([
                    alterTableAddColumn('repairs', 'station_id', 'INTEGER REFERENCES stations(id) ON DELETE SET NULL'),
                    alterTableAddColumn('repairs', 'station_area_id', 'INTEGER REFERENCES station_areas(id) ON DELETE SET NULL'),
                    alterTableAddColumn('withdrawals', 'station_id', 'INTEGER REFERENCES stations(id) ON DELETE SET NULL'),
                    alterTableAddColumn('inventory_transactions', 'station_id', 'INTEGER REFERENCES stations(id) ON DELETE SET NULL'),
                    alterTableAddColumn('inventory_instances', 'station_id', 'INTEGER REFERENCES stations(id) ON DELETE SET NULL')
                  ]).then(() => {
                    // Create indexes for foreign keys
                    db.run(`CREATE INDEX IF NOT EXISTS idx_repairs_station_id ON repairs(station_id)`, () => {
                      db.run(`CREATE INDEX IF NOT EXISTS idx_repairs_station_area_id ON repairs(station_area_id)`, () => {
                        db.run(`CREATE INDEX IF NOT EXISTS idx_withdrawals_station_id ON withdrawals(station_id)`, () => {
                          db.run(`CREATE INDEX IF NOT EXISTS idx_inv_tx_station_id ON inventory_transactions(station_id)`, () => {
                            db.run(`CREATE INDEX IF NOT EXISTS idx_inv_inst_station_id ON inventory_instances(station_id)`, () => {
                              
                              // 5. Backfill historical data (Data Cleansing Mapping)
                              // We load stations list to match
                              db.all("SELECT id, name, province, region FROM stations", [], (err, stationsList) => {
                                if (err) return callback(err);

                                // Helper function to map text location to station id
                                const getMatchingStationId = (textLoc) => {
                                  if (!textLoc) return null;
                                  const clean = textLoc.trim().toLowerCase();
                                  
                                  // Look for exact matches or containing words
                                  for (const st of stationsList) {
                                    const stName = st.name.toLowerCase();
                                    // Extract core name (e.g. "แม่ใจ" from "สถานีตรวจสอบน้ำหนัก แม่ใจ (ขาเข้า)")
                                    const coreNameMatch = stName.replace('สถานีตรวจสอบน้ำหนัก ', '').replace(' (ขาเข้า)', '').replace(' (ขาออก)', '').trim();
                                    
                                    if (clean === stName || 
                                        clean.includes(coreNameMatch) || 
                                        stName.includes(clean)) {
                                      return st.id;
                                    }
                                  }
                                  return null;
                                };

                                // Perform backfill for each table
                                const backfillTable = (tableName, locationColName, stationIdColName) => {
                                  return new Promise((resolve) => {
                                    db.all(`SELECT id, ${locationColName} FROM ${tableName} WHERE ${stationIdColName} IS NULL AND ${locationColName} IS NOT NULL`, [], (err, records) => {
                                      if (err || !records || records.length === 0) {
                                        return resolve();
                                      }

                                      const updateStmt = db.prepare(`UPDATE ${tableName} SET ${stationIdColName} = ? WHERE id = ?`);
                                      let updatedCount = 0;
                                      
                                      records.forEach((row) => {
                                        const locVal = row[locationColName];
                                        const matchId = getMatchingStationId(locVal);
                                        if (matchId) {
                                          updateStmt.run(matchId, row.id);
                                          updatedCount++;
                                        }
                                      });

                                      updateStmt.finalize(() => {
                                        console.log(`Backfilled ${updatedCount}/${records.length} records in ${tableName}.`);
                                        resolve();
                                      });
                                    });
                                  });
                                };

                                Promise.all([
                                  backfillTable('repairs', 'location', 'station_id'),
                                  backfillTable('withdrawals', 'location', 'station_id'),
                                  backfillTable('inventory_transactions', 'location', 'station_id'),
                                  backfillTable('inventory_instances', 'current_location', 'station_id')
                                ]).then(() => {
                                  // Finished!
                                  callback(null);
                                }).catch(callback);

                              });
                            });
                          });
                        });
                      });
                    });
                  }).catch(callback);

                });
              });
            });
          });
        });
      });
    });
  }
};
