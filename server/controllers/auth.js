const bcrypt = require('bcryptjs');
const db = require('../database/init');
const { sign } = require('../utils/jwt');

const PASSWORD_MIN_LEN = 8;

const sanitizeUser = (row) => {
  if (!row) return null;
  let permissions = {};
  try { permissions = row.permissions ? JSON.parse(row.permissions) : {}; } catch { permissions = {}; }
  return {
    id: row.id,
    username: row.username,
    full_name: row.full_name,
    is_full: row.is_full === 1,
    permissions,
    force_password_change: row.force_password_change === 1,
    is_active: row.is_active === 1,
    last_login: row.last_login,
  };
};

exports.login = (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อผู้ใช้และรหัสผ่าน' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username.trim()], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    if (!row.is_active) return res.status(401).json({ error: 'บัญชีถูกระงับการใช้งาน' });

    bcrypt.compare(password, row.password_hash, (cmpErr, ok) => {
      if (cmpErr) return res.status(500).json({ error: cmpErr.message });
      if (!ok) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

      const token = sign({ userId: row.id });
      db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [row.id]);

      res.json({
        token,
        user: sanitizeUser(row),
      });
    });
  });
};

exports.me = (req, res) => {
  db.get(
    `SELECT id, username, full_name, is_full, permissions, force_password_change, is_active, last_login
     FROM users WHERE id = ?`,
    [req.user.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'ไม่พบบัญชี' });
      res.json({ user: sanitizeUser(row) });
    }
  );
};

exports.changePassword = (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'กรุณาระบุรหัสผ่านปัจจุบันและรหัสผ่านใหม่' });
  }
  if (new_password.length < PASSWORD_MIN_LEN) {
    return res.status(400).json({ error: `รหัสผ่านใหม่ต้องมีอย่างน้อย ${PASSWORD_MIN_LEN} ตัวอักษร` });
  }

  db.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'ไม่พบบัญชี' });

    bcrypt.compare(current_password, row.password_hash, (cmpErr, ok) => {
      if (cmpErr) return res.status(500).json({ error: cmpErr.message });
      if (!ok) return res.status(401).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });

      bcrypt.hash(new_password, 10, (hashErr, hash) => {
        if (hashErr) return res.status(500).json({ error: hashErr.message });

        db.run(
          `UPDATE users SET password_hash = ?, force_password_change = 0,
           password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [hash, req.user.id],
          (updErr) => {
            if (updErr) return res.status(500).json({ error: updErr.message });

            // Issue a fresh token so the client can continue immediately
            const token = sign({ userId: req.user.id });
            res.json({ message: 'เปลี่ยนรหัสผ่านเรียบร้อย', token });
          }
        );
      });
    });
  });
};
