module.exports = {
  name: '033_add_approved_by_and_approved_at_to_purchase_orders',
  up: (db, callback) => {
    db.serialize(() => {
      db.run("ALTER TABLE purchase_orders ADD COLUMN approved_by TEXT", (err) => {
        if (err && !err.message.includes("duplicate column name")) {
          return callback(err);
        }
        db.run("ALTER TABLE purchase_orders ADD COLUMN approved_at DATETIME", (err2) => {
          if (err2 && !err2.message.includes("duplicate column name")) {
            return callback(err2);
          }
          callback(null);
        });
      });
    });
  }
};
