module.exports = {
  name: '015_add_storage_location_to_inventory',
  up: (db, callback) => {
    db.run("ALTER TABLE inventory ADD COLUMN storage_location TEXT", callback);
  }
};
