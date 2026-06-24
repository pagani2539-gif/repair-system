module.exports = {
  name: '016_add_company_name_to_purchase_orders',
  up: (db, callback) => {
    db.run("ALTER TABLE purchase_orders ADD COLUMN company_name TEXT", (err) => {
      if (err && !err.message.includes("duplicate column name")) {
        return callback(err);
      }
      callback(null);
    });
  }
};
