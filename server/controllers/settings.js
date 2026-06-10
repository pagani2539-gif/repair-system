const db = require('../database/init');
const fs = require('fs');
const path = require('path');

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
