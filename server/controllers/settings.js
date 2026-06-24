const db = require('../database/init');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// ============================================================
// Companies (multi)
// ============================================================

exports.getCompanies = (req, res) => {
  db.all('SELECT * FROM companies ORDER BY is_default DESC, id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
};

exports.getCompanyById = (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM companies WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'ไม่พบบริษัท' });
    res.json(row);
  });
};

exports.createCompany = (req, res) => {
  const { name_th, name_en, name_short, address, phone, email, tax_id, website } = req.body;
  if (!name_th || !name_th.trim()) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อบริษัท (ภาษาไทย)' });
  }

  db.get('SELECT COUNT(*) as cnt FROM companies', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    const isDefault = row && row.cnt === 0 ? 1 : 0;

    db.run(
      `INSERT INTO companies (name_th, name_en, name_short, address, phone, email, tax_id, website, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name_th.trim(),
        name_en || '',
        name_short || '',
        address || '',
        phone || '',
        email || '',
        tax_id || '',
        website || '',
        isDefault,
      ],
      function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        res.status(201).json({ id: this.lastID, message: 'เพิ่มบริษัทเรียบร้อย' });
      }
    );
  });
};

exports.updateCompany = (req, res) => {
  const { id } = req.params;
  const { name_th, name_en, name_short, address, phone, email, tax_id, website } = req.body;
  if (!name_th || !name_th.trim()) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อบริษัท (ภาษาไทย)' });
  }

  db.run(
    `UPDATE companies SET
       name_th = ?, name_en = ?, name_short = ?, address = ?, phone = ?, email = ?,
       tax_id = ?, website = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      name_th.trim(),
      name_en || '',
      name_short || '',
      address || '',
      phone || '',
      email || '',
      tax_id || '',
      website || '',
      id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'ไม่พบบริษัท' });
      res.json({ message: 'บันทึกข้อมูลบริษัทเรียบร้อย' });
    }
  );
};

exports.deleteCompany = (req, res) => {
  const { id } = req.params;

  db.get('SELECT COUNT(*) as cnt FROM companies', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row && row.cnt <= 1) {
      return res.status(400).json({ error: 'ต้องมีบริษัทอย่างน้อย 1 อันในระบบ' });
    }

    db.get('SELECT is_default FROM companies WHERE id = ?', [id], (err2, target) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (!target) return res.status(404).json({ error: 'ไม่พบบริษัท' });

      // Delete logo files belonging to this company
      db.all('SELECT file_path FROM company_logos WHERE company_id = ?', [id], (err3, logos) => {
        if (!err3 && logos) {
          logos.forEach((logo) => {
            const fullPath = path.join(__dirname, '..', 'uploads', logo.file_path);
            fs.unlink(fullPath, (unlinkErr) => {
              if (unlinkErr) console.warn('Failed to delete logo file:', unlinkErr.message);
            });
          });
        }

        // Delete logos rows + company row
        db.run('DELETE FROM company_logos WHERE company_id = ?', [id], () => {
          db.run('DELETE FROM companies WHERE id = ?', [id], (err4) => {
            if (err4) return res.status(500).json({ error: err4.message });

            // If we deleted the default, promote another company
            if (target.is_default) {
              db.get('SELECT id FROM companies ORDER BY id ASC LIMIT 1', [], (err5, nextRow) => {
                if (!err5 && nextRow) {
                  db.run('UPDATE companies SET is_default = 1 WHERE id = ?', [nextRow.id]);
                }
                res.json({ message: 'ลบบริษัทเรียบร้อย' });
              });
            } else {
              res.json({ message: 'ลบบริษัทเรียบร้อย' });
            }
          });
        });
      });
    });
  });
};

exports.setDefaultCompany = (req, res) => {
  const { id } = req.params;

  db.serialize(() => {
    db.run('UPDATE companies SET is_default = 0', [], (err) => {
      if (err) return res.status(500).json({ error: err.message });

      db.run('UPDATE companies SET is_default = 1 WHERE id = ?', [id], function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        if (this.changes === 0) return res.status(404).json({ error: 'ไม่พบบริษัท' });
        res.json({ message: 'ตั้งเป็นบริษัทหลักเรียบร้อย' });
      });
    });
  });
};

// ============================================================
// Logos (scoped by company)
// ============================================================

exports.getLogos = (req, res) => {
  const { company_id } = req.query;
  let sql = 'SELECT * FROM company_logos';
  const params = [];

  if (company_id) {
    sql += ' WHERE company_id = ? OR company_id IS NULL';
    params.push(company_id);
  }
  sql += ' ORDER BY is_default DESC, uploaded_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
};

exports.uploadLogo = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'ไม่พบไฟล์รูปภาพ' });

  const { label, company_id } = req.body;
  const filePath = `logos/${req.file.filename}`;
  const logoLabel = (label && label.trim()) || `โลโก้ ${new Date().toLocaleDateString('th-TH')}`;
  const companyId = company_id ? parseInt(company_id, 10) : null;

  // Determine is_default: first logo for this company → default for that company
  const checkSql = companyId
    ? 'SELECT COUNT(*) as cnt FROM company_logos WHERE company_id = ?'
    : 'SELECT COUNT(*) as cnt FROM company_logos WHERE company_id IS NULL';
  const checkParams = companyId ? [companyId] : [];

  db.get(checkSql, checkParams, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    const isDefault = row && row.cnt === 0 ? 1 : 0;

    db.run(
      `INSERT INTO company_logos (label, file_path, is_default, company_id) VALUES (?, ?, ?, ?)`,
      [logoLabel, filePath, isDefault, companyId],
      function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        res.status(201).json({
          id: this.lastID,
          label: logoLabel,
          file_path: filePath,
          is_default: isDefault,
          company_id: companyId,
          message: 'อัปโหลดโลโก้เรียบร้อย',
        });
      }
    );
  });
};

exports.setDefaultLogo = (req, res) => {
  const { id } = req.params;

  // Default is scoped per company
  db.get('SELECT company_id FROM company_logos WHERE id = ?', [id], (err, target) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!target) return res.status(404).json({ error: 'ไม่พบโลโก้ที่ระบุ' });

    const resetSql = target.company_id
      ? 'UPDATE company_logos SET is_default = 0 WHERE company_id = ?'
      : 'UPDATE company_logos SET is_default = 0 WHERE company_id IS NULL';
    const resetParams = target.company_id ? [target.company_id] : [];

    db.serialize(() => {
      db.run(resetSql, resetParams, (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });

        db.run('UPDATE company_logos SET is_default = 1 WHERE id = ?', [id], function (err3) {
          if (err3) return res.status(500).json({ error: err3.message });
          res.json({ message: 'ตั้งเป็นโลโก้หลักเรียบร้อย' });
        });
      });
    });
  });
};

exports.deleteLogo = (req, res) => {
  const { id } = req.params;

  db.get('SELECT file_path, is_default, company_id FROM company_logos WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'ไม่พบโลโก้ที่ระบุ' });

    db.run('DELETE FROM company_logos WHERE id = ?', [id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      const fullPath = path.join(__dirname, '..', 'uploads', row.file_path);
      fs.unlink(fullPath, (unlinkErr) => {
        if (unlinkErr) console.warn('Failed to delete logo file:', unlinkErr.message);
      });

      // Promote another logo from the same company to default (if we deleted the default)
      if (row.is_default) {
        const promoteSql = row.company_id
          ? 'SELECT id FROM company_logos WHERE company_id = ? ORDER BY uploaded_at DESC LIMIT 1'
          : 'SELECT id FROM company_logos WHERE company_id IS NULL ORDER BY uploaded_at DESC LIMIT 1';
        const promoteParams = row.company_id ? [row.company_id] : [];

        db.get(promoteSql, promoteParams, (err3, nextRow) => {
          if (!err3 && nextRow) {
            db.run('UPDATE company_logos SET is_default = 1 WHERE id = ?', [nextRow.id]);
          }
          res.json({ message: 'ลบโลโก้เรียบร้อย' });
        });
      } else {
        res.json({ message: 'ลบโลโก้เรียบร้อย' });
      }
    });
  });
};

// ============================================================
// System Settings (Key-Value)
// ============================================================

exports.getSystemSettings = (req, res) => {
  db.all('SELECT key, value FROM system_settings', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const settings = {};
    (rows || []).forEach(r => {
      if (r.key.includes('token') && (!req.user || !req.user.is_full)) {
        settings[r.key] = '••••••••••••••••';
      } else {
        settings[r.key] = r.value;
      }
    });
    res.json(settings);
  });
};

exports.updateSystemSettings = (req, res) => {
  const settings = req.body || {};
  const keys = Object.keys(settings);
  
  if (keys.length === 0) {
    return res.json({ message: 'ไม่มีข้อมูลตั้งค่าที่ถูกอัปเดต' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    let errorOccurred = false;
    let completedCount = 0;
    
    keys.forEach(key => {
      db.run(
        `INSERT INTO system_settings (key, value, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        [key, settings[key]],
        (err) => {
          if (errorOccurred) return;
          if (err) {
            errorOccurred = true;
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }

          completedCount++;
          if (completedCount === keys.length && !errorOccurred) {
            db.run('COMMIT');
            res.json({ message: 'บันทึกการตั้งค่าระบบเรียบร้อย' });
          }
        }
      );
    });
  });
};

// ============================================================
// Database Backup & Restore Manager
// ============================================================
const BACKUP_DIR = path.join(__dirname, '..', 'database', 'backups');

exports.getBackups = (req, res) => {
  if (!fs.existsSync(BACKUP_DIR)) {
    return res.json([]);
  }
  
  fs.readdir(BACKUP_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const backups = files
      .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
      .map(f => {
        const filePath = path.join(BACKUP_DIR, f);
        const stats = fs.statSync(filePath);
        return {
          filename: f,
          size: stats.size,
          created_at: stats.mtime
        };
      })
      .sort((a, b) => b.created_at - a.created_at);
      
    res.json(backups);
  });
};

exports.createBackup = (req, res) => {
  const { runBackup } = require('../database/backup');
  runBackup(db)
    .then(filePath => {
      res.status(201).json({ 
        message: 'สำรองข้อมูลฐานข้อมูลสำเร็จ',
        filename: path.basename(filePath) 
      });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
};

exports.deleteBackup = (req, res) => {
  const { filename } = req.params;
  if (!filename || filename.includes('..') || !filename.endsWith('.db') || !filename.startsWith('backup_')) {
    return res.status(400).json({ error: 'ชื่อไฟล์ไม่ถูกต้อง' });
  }
  
  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'ไม่พบไฟล์สำรองข้อมูล' });
  }
  
  fs.unlink(filePath, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'ลบไฟล์สำรองข้อมูลเรียบร้อย' });
  });
};

exports.downloadBackup = (req, res) => {
  const { filename } = req.params;
  if (!filename || filename.includes('..') || !filename.endsWith('.db') || !filename.startsWith('backup_')) {
    return res.status(400).json({ error: 'ชื่อไฟล์ไม่ถูกต้อง' });
  }
  
  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'ไม่พบไฟล์สำรองข้อมูล' });
  }
  
  res.download(filePath, filename);
};

exports.restoreBackup = (req, res) => {
  const { filename, password, confirm_text } = req.body;
  
  if (!filename || filename.includes('..') || !filename.endsWith('.db') || !filename.startsWith('backup_')) {
    return res.status(400).json({ error: 'ชื่อไฟล์ไม่ถูกต้อง' });
  }
  if (!password || !password.trim()) {
    return res.status(400).json({ error: 'กรุณากรอกรหัสผ่านเพื่อยืนยันสิทธิ์' });
  }
  if (confirm_text !== 'RESTORE') {
    return res.status(400).json({ error: 'กรุณาพิมพ์คำว่า RESTORE เพื่อยืนยัน' });
  }
  
  const backupPath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ error: 'ไม่พบไฟล์สำรองข้อมูล' });
  }
  
  db.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'ไม่พบบัญชีผู้ใช้' });
    
    bcrypt.compare(password, row.password_hash, (cmpErr, ok) => {
      if (cmpErr) return res.status(500).json({ error: cmpErr.message });
      if (!ok) return res.status(401).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
      
      console.log(`Starting Database Restore from: ${backupPath}`);
      const dbFileName = process.env.NODE_ENV === 'test' ? 'repair_system_test.db' : 'repair_system.db';
      const dbFile = path.join(__dirname, '..', 'database', dbFileName);
      
      // Close active database before copying
      db.close((closeErr) => {
        if (closeErr) {
          console.error('Failed to close DB for restore:', closeErr.message);
          return res.status(500).json({ error: 'ไม่สามารถปิดการเชื่อมต่อฐานข้อมูลได้: ' + closeErr.message });
        }
        
        fs.copyFile(backupPath, dbFile, (copyErr) => {
          if (copyErr) {
            // The shared db connection is already closed and cannot be re-injected
            // into modules that hold a reference — restart so init.js reopens it.
            // The original db file is untouched when copyFile fails.
            console.error('Failed to restore db file:', copyErr.message);
            res.status(500).json({ error: 'ไม่สามารถกู้คืนฐานข้อมูลได้: ' + copyErr.message + ' ระบบกำลังรีสตาร์ทเซิร์ฟเวอร์' });
            setTimeout(() => {
              process.exit(1);
            }, 1000);
            return;
          }
          
          console.log('Database restored successfully. Restarting server to apply changes...');
          res.json({ message: 'กู้คืนฐานข้อมูลสำเร็จแล้ว ระบบกำลังรีสตาร์ทเซิร์ฟเวอร์ใน 1 วินาที...' });
          
          setTimeout(() => {
            process.exit(0);
          }, 1000);
        });
      });
    });
  });
};
