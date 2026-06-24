const db = require('../database/init');
const { logAudit } = require('../utils/auditLogger');

// SQLite Query Helpers for Async/Await
const queryAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

const queryGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

exports.getAllContracts = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT c.*, co.name_th as company_name
      FROM contracts c
      LEFT JOIN companies co ON c.company_id = co.id
    `;
    const params = [];
    if (status !== undefined) {
      query += ` WHERE c.status = ?`;
      params.push(status);
    }
    query += ` ORDER BY c.year_be DESC, c.contract_no ASC`;
    const rows = await queryAll(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Get Contracts Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.createContract = (req, res) => {
  const { contract_no, name, year_be, company_id, start_date, end_date, note } = req.body;

  if (!contract_no || !name || !year_be) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน (เลขที่สัญญา, ชื่อสัญญา, ปี พ.ศ.)' });
  }

  db.run(`
    INSERT INTO contracts (contract_no, name, year_be, company_id, start_date, end_date, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [contract_no.trim(), name.trim(), year_be, company_id || null, start_date || null, end_date || null, note || null], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'เลขที่สัญญานี้มีอยู่แล้วในระบบ' });
      }
      return res.status(500).json({ error: err.message });
    }

    const newId = this.lastID;
    db.get('SELECT * FROM contracts WHERE id = ?', [newId], (getErr, row) => {
      if (getErr) return res.status(500).json({ error: getErr.message });
      logAudit('contract', newId, 'create', null, row, req.user?.full_name || 'System/Admin').catch(e => console.error(e));
      res.status(201).json(row);
    });
  });
};

exports.updateContract = async (req, res) => {
  const { id } = req.params;
  const { contract_no, name, year_be, company_id, start_date, end_date, note } = req.body;

  if (!contract_no || !name || !year_be) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน (เลขที่สัญญา, ชื่อสัญญา, ปี พ.ศ.)' });
  }

  try {
    const oldContract = await queryGet('SELECT * FROM contracts WHERE id = ?', [id]);
    if (!oldContract) return res.status(404).json({ error: 'ไม่พบสัญญาที่ต้องการแก้ไข' });

    db.run(`
      UPDATE contracts
      SET contract_no = ?, name = ?, year_be = ?, company_id = ?, start_date = ?, end_date = ?, note = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [contract_no.trim(), name.trim(), year_be, company_id || null, start_date || null, end_date || null, note || null, id], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'เลขที่สัญญานี้มีอยู่แล้วในระบบ' });
        }
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'ไม่พบสัญญาที่ต้องการแก้ไข' });
      }

      db.get('SELECT * FROM contracts WHERE id = ?', [id], (getErr, row) => {
        if (getErr) return res.status(500).json({ error: getErr.message });
        logAudit('contract', id, 'update', oldContract, row, req.user?.full_name || 'System/Admin').catch(e => console.error(e));
        res.json(row);
      });
    });
  } catch (err) {
    console.error('Update Contract Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteContract = (req, res) => {
  const { id } = req.params;
  const deleted_by = req.user?.full_name || 'System/Admin';

  db.get('SELECT * FROM contracts WHERE id = ?', [id], (err, oldContract) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!oldContract) return res.status(404).json({ error: 'ไม่พบสัญญาที่ต้องการลบ' });

    db.run(`
      UPDATE contracts
      SET status = 0, deleted_at = CURRENT_TIMESTAMP, deleted_by = ?
      WHERE id = ?
    `, [deleted_by, id], function(err) {
      if (err) {
        console.error('Delete Contract Error:', err);
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'ไม่พบสัญญาที่ต้องการลบ' });
      }

      logAudit('contract', id, 'deactivate', oldContract, { ...oldContract, status: 0, deleted_at: new Date().toISOString() }, deleted_by).catch(e => console.error(e));
      res.json({ message: 'ปิดใช้งานสัญญาเรียบร้อยแล้ว (Soft Delete)' });
    });
  });
};
