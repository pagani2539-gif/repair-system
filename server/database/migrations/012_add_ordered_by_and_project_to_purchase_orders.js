module.exports = {
  name: '012_add_ordered_by_and_project_to_purchase_orders',
  up: (db, callback) => {
    db.serialize(() => {
      db.run("ALTER TABLE purchase_orders ADD COLUMN ordered_by TEXT", (err) => {
        if (err) {
          if (err.message.includes("duplicate column name")) {
            return addProject();
          }
          return callback(err);
        }
        addProject();
      });

      function addProject() {
        db.run("ALTER TABLE purchase_orders ADD COLUMN project_name TEXT", (err) => {
          if (err && !err.message.includes("duplicate column name")) {
            return callback(err);
          }
          callback(null);
        });
      }
    });
  }
};
