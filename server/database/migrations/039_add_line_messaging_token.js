module.exports = {
  name: '039_add_line_messaging_token',
  up: (db, callback) => {
    db.run(
      `INSERT OR IGNORE INTO system_settings (key, value) VALUES ('line_channel_access_token', '')`,
      callback
    );
  }
};
