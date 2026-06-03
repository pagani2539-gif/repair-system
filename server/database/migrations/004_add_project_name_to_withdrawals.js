module.exports = {
  name: '004_add_project_name_to_withdrawals',
  up: (db, callback) => {
    db.run("ALTER TABLE withdrawals ADD COLUMN project_name TEXT", callback);
  }
};
