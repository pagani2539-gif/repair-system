module.exports = {
  name: '010_add_requires_sn_to_inventory',
  up: (db, callback) => {
    db.run("ALTER TABLE inventory ADD COLUMN requires_sn INTEGER DEFAULT 1", callback);
  }
};
