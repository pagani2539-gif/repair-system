module.exports = {
  name: '038_create_sequences',
  up: (db, callback) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS sequences (
          prefix TEXT NOT NULL,
          date_part TEXT NOT NULL,
          seq INTEGER NOT NULL,
          PRIMARY KEY (prefix, date_part)
        )
      `, (err) => {
        if (err && !err.message.includes('already exists')) {
          return callback(err);
        }
        callback(null);
      });
    });
  }
};
