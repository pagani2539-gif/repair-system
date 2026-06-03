module.exports = {
  name: '001_add_is_read_to_repairs',
  up: (db, callback) => {
    db.run("ALTER TABLE repairs ADD COLUMN is_read INTEGER DEFAULT 0", callback);
  }
};
