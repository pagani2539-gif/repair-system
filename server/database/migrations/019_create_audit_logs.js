module.exports = {
  name: '019_create_audit_logs',
  up: (db, callback) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entity_type TEXT NOT NULL,
          entity_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          old_data TEXT,
          new_data TEXT,
          user_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return callback(err);

        // Create indexes to optimize audit queries
        db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)`, (err) => {
          if (err) console.warn("Warning creating audit logs entity index:", err.message);
          
          db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`, (err) => {
            if (err) console.warn("Warning creating audit logs created_at index:", err.message);
            callback(null);
          });
        });
      });
    });
  }
};
