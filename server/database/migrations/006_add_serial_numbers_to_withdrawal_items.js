module.exports = {
  name: '006_add_serial_numbers_to_withdrawal_items',
  up: (db, callback) => {
    db.run("ALTER TABLE withdrawal_items ADD COLUMN serial_numbers TEXT", callback);
  }
};
