module.exports = {
  name: '003_add_type_to_repairs',
  up: (db, callback) => {
    db.run("ALTER TABLE repairs ADD COLUMN type TEXT DEFAULT 'repair'", callback);
  }
};
