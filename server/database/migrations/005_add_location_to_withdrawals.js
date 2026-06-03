module.exports = {
  name: '005_add_location_to_withdrawals',
  up: (db, callback) => {
    db.run("ALTER TABLE withdrawals ADD COLUMN location TEXT", callback);
  }
};
