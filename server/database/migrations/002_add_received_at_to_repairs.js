module.exports = {
  name: '002_add_received_at_to_repairs',
  up: (db, callback) => {
    db.run("ALTER TABLE repairs ADD COLUMN received_at DATETIME", callback);
  }
};
