module.exports = {
  name: '008_add_withdrawal_id_to_transactions',
  up: (db, callback) => {
    db.run("ALTER TABLE inventory_transactions ADD COLUMN withdrawal_id INTEGER", callback);
  }
};
