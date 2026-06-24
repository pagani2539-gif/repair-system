module.exports = {
  name: '022_add_vendor_details_to_purchase_orders',
  up: (db, callback) => {
    const columns = [
      "ALTER TABLE purchase_orders ADD COLUMN vendor_address TEXT",
      "ALTER TABLE purchase_orders ADD COLUMN vendor_phone TEXT",
      "ALTER TABLE purchase_orders ADD COLUMN vendor_contact_person TEXT",
      "ALTER TABLE purchase_orders ADD COLUMN vendor_tax_id TEXT"
    ];

    let i = 0;
    const next = () => {
      if (i >= columns.length) return callback(null);
      db.run(columns[i], (err) => {
        if (err && !err.message.includes("duplicate column name")) {
          return callback(err);
        }
        i++;
        next();
      });
    };
    next();
  }
};
