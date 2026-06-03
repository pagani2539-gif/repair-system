module.exports = {
  name: '013_add_project_name_to_repairs',
  up: (db, callback) => {
    db.run("ALTER TABLE repairs ADD COLUMN project_name TEXT", (err) => {
      if (err) {
        // If the column already exists, treat it as a success
        if (err.message.includes("duplicate column name") || err.message.includes("already exists")) {
          return callback(null);
        }
        return callback(err);
      }
      callback(null);
    });
  }
};
