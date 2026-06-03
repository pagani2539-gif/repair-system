module.exports = {
  name: '009_add_status_to_transactions',
  up: (db, callback) => {
    db.run("ALTER TABLE inventory_transactions ADD COLUMN status TEXT DEFAULT 'ACTIVE'", callback);
  }
};
