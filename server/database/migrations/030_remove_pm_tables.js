module.exports = {
  name: '030_remove_pm_tables',
  up: (db, callback) => {
    db.serialize(() => {
      db.run('DROP TABLE IF EXISTS pm_logs', (err) => {
        if (err) return callback(err);
        db.run('DROP TABLE IF EXISTS pm_schedules', (err) => {
          if (err) return callback(err);
          callback(null);
        });
      });
    });
  }
};
