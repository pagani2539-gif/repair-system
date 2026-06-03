module.exports = {
  name: '014_add_return_image_to_transactions',
  up: (db, callback) => {
    db.run("ALTER TABLE inventory_transactions ADD COLUMN return_image TEXT", callback);
  }
};
