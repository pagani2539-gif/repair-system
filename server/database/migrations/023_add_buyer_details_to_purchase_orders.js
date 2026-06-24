module.exports = {
  name: '023_add_buyer_details_to_purchase_orders',
  up: (db, callback) => {
    const columns = [
      "ALTER TABLE purchase_orders ADD COLUMN buyer_department TEXT",
      "ALTER TABLE purchase_orders ADD COLUMN buyer_phone TEXT",
      "ALTER TABLE purchase_orders ADD COLUMN buyer_email TEXT"
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
