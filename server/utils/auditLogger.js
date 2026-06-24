const db = require('../database/init');

const logAudit = (entityType, entityId, action, oldData, newData, userName) => {
  return new Promise((resolve, reject) => {
    const oldDataStr = oldData ? JSON.stringify(oldData) : null;
    const newDataStr = newData ? JSON.stringify(newData) : null;
    db.run(`
      INSERT INTO audit_logs (entity_type, entity_id, action, old_data, new_data, user_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      entityType,
      entityId,
      action,
      oldDataStr,
      newDataStr,
      userName || 'System/Admin'
    ], function(err) {
      if (err) {
        console.error('Failed to write audit log:', err.message);
        return reject(err);
      }
      resolve(this.lastID);
    });
  });
};

module.exports = {
  logAudit
};
