module.exports = {
  name: '034_link_repairs_to_inventory',
  up: (db, callback) => {
    db.serialize(() => {
      db.run("ALTER TABLE repairs ADD COLUMN instance_id INTEGER", (err) => {
        if (err && !err.message.includes("duplicate column name")) {
          return callback(err);
        }
        db.run("ALTER TABLE repairs ADD COLUMN inventory_id INTEGER", (err2) => {
          if (err2 && !err2.message.includes("duplicate column name")) {
            return callback(err2);
          }
          callback(null);
        });
      });
    });
  }
};
