const bcrypt = require('bcryptjs');
const db = require('../database/init');

const sanitize = (row) => {
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
    created_by: row.created_by,
    created_at: row.created_at,
  };
};

exports.list = (req, res) => {
  db.all(
    `SELECT id, username, full_name, is_full, permissions, force_password_change, is_active, last_login, created_by, created_at
     FROM users ORDER BY is_full DESC, id ASC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json((rows || []).map(sanitize));
    }
  );
};

exports.getById = (req, res) => {
  db.get(
    `SELECT id, username, full_name, is_full, permissions, force_password_change, is_active, last_login, created_by, created_at
     FROM users WHERE id = ?`,
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
      res.json(sanitize(row));
    }
  );
};

exports.create = (req, res) => {
  const { username, password, full_name, is_full, permissions, force_password_change } = req.body || {};
  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'กรุณาระบุ username, password และชื่อ-สกุล' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
  }

  const trimmedUsername = String(username).trim();
  const permissionsJson = JSON.stringify(permissions && typeof permissions === 'object' ? permissions : {});

  bcrypt.hash(password, 10, (hashErr, hash) => {
    if (hashErr) return res.status(500).json({ error: hashErr.message });

    db.run(
      `INSERT INTO users (username, password_hash, full_name, is_full, permissions, force_password_change, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        trimmedUsername,
        hash,
        full_name.trim(),
        is_full ? 1 : 0,
        permissionsJson,
        force_password_change ? 1 : 0,
        req.user.id,
      ],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });
          }
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, message: 'สร้างผู้ใช้เรียบร้อย' });
      }
    );
  });
};

exports.update = (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id, 10);
  const { full_name, password, is_full, permissions, is_active } = req.body || {};

  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, target) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!target) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });

    // Self-protection
    const isSelf = req.user.id === userId;
    const wantsToggleFull = is_full !== undefined && (is_full ? 1 : 0) !== target.is_full;
    const wantsDeactivate = is_active === false || is_active === 0;

    if (isSelf && wantsToggleFull) {
      return res.status(400).json({ error: 'ไม่สามารถเปลี่ยนสิทธิ์ผู้ดูแลของบัญชีตัวเองได้' });
    }
    if (isSelf && wantsDeactivate) {
      return res.status(400).json({ error: 'ไม่สามารถปิดบัญชีตัวเองได้' });
    }

    // Prevent removing the last Full user
    if (wantsToggleFull && target.is_full === 1 && !is_full) {
      return db.get('SELECT COUNT(*) as cnt FROM users WHERE is_full = 1 AND is_active = 1', [], (cErr, row) => {
        if (cErr) return res.status(500).json({ error: cErr.message });
        if (row.cnt <= 1) {
          return res.status(400).json({ error: 'ต้องมีผู้ดูแลระบบ (Full) อย่างน้อย 1 คน' });
        }
        applyUpdate();
      });
    }
    applyUpdate();

    function applyUpdate() {
      const fields = [];
      const params = [];

      if (full_name !== undefined) {
        fields.push('full_name = ?');
        params.push(String(full_name).trim());
      }
      if (is_full !== undefined) {
        fields.push('is_full = ?');
        params.push(is_full ? 1 : 0);
      }
      if (permissions !== undefined) {
        fields.push('permissions = ?');
        params.push(JSON.stringify(permissions && typeof permissions === 'object' ? permissions : {}));
      }
      if (is_active !== undefined) {
        fields.push('is_active = ?');
        params.push(is_active ? 1 : 0);
      }

      const finalizePassword = (callback) => {
        if (!password) return callback();
        if (password.length < 6) {
          return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
        }
        bcrypt.hash(password, 10, (hashErr, hash) => {
          if (hashErr) return res.status(500).json({ error: hashErr.message });
          fields.push('password_hash = ?', 'password_changed_at = CURRENT_TIMESTAMP', 'force_password_change = 0');
          params.push(hash);
          callback();
        });
      };

      finalizePassword(() => {
        if (fields.length === 0) return res.json({ message: 'ไม่มีข้อมูลที่ต้องอัปเดต' });
        fields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(userId);

        db.run(
          `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
          params,
          function (uErr) {
            if (uErr) return res.status(500).json({ error: uErr.message });
            if (this.changes === 0) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
            res.json({ message: 'บันทึกข้อมูลผู้ใช้เรียบร้อย' });
          }
        );
      });
    }
  });
};

// Soft-delete: set is_active = 0 (preserves history)
exports.remove = (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id, 10);

  if (req.user.id === userId) {
    return res.status(400).json({ error: 'ไม่สามารถลบบัญชีตัวเองได้' });
  }

  db.get('SELECT is_full FROM users WHERE id = ?', [userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });

    const finalize = () => {
      db.run(
        `UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [userId],
        function (uErr) {
          if (uErr) return res.status(500).json({ error: uErr.message });
          res.json({ message: 'ปิดการใช้งานบัญชีเรียบร้อย' });
        }
      );
    };

    if (row.is_full) {
      db.get('SELECT COUNT(*) as cnt FROM users WHERE is_full = 1 AND is_active = 1', [], (cErr, c) => {
        if (cErr) return res.status(500).json({ error: cErr.message });
        if (c.cnt <= 1) {
          return res.status(400).json({ error: 'ต้องมีผู้ดูแลระบบ (Full) อย่างน้อย 1 คน' });
        }
        finalize();
      });
    } else {
      finalize();
    }
  });
};
