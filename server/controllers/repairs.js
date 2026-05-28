const db = require('../database/init');

// Helper to generate Ticket Number
const generateTicketNo = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RE-${date}-${random}`;
};

exports.getUnreadCount = (req, res) => {
  db.all("SELECT type, COUNT(*) as count FROM repairs WHERE is_read = 0 GROUP BY type", (err, rows) => {
    if (err) {
      console.error("Database error in getUnreadCount:", err);
      return res.status(500).json({ error: err.message });
    }
    
    const repairUnread = (rows && rows.find(r => r.type === 'repair')?.count) || 0;
    const claimUnread = (rows && rows.find(r => r.type === 'claim')?.count) || 0;
    
    console.log("Unread count from DB: repair =", repairUnread, ", claim =", claimUnread);
    res.json({ 
      repair: repairUnread, 
      claim: claimUnread, 
      total: repairUnread + claimUnread,
      count: repairUnread + claimUnread
    });
  });
};

exports.getAllRepairs = (req, res) => {
  const { status, location, search, type } = req.query;
  let query = 'SELECT * FROM repairs WHERE 1=1';
  const params = [];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  if (status && status !== 'All' && status !== 'ทั้งหมด') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (location && location !== 'All') {
    query += ' AND location = ?';
    params.push(location);
  }

  if (search) {
    query += ' AND (ticket_no LIKE ? OR reporter LIKE ? OR problem LIKE ? OR device_name LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.getStats = (req, res) => {
  const query = `
    SELECT 
      type,
      COUNT(*) as total,
      SUM(CASE WHEN TRIM(status) = 'รอดำเนินการ' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN TRIM(status) = 'กำลังซ่อม' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN TRIM(status) = 'รออะไหล่' THEN 1 ELSE 0 END) as on_hold,
      SUM(CASE WHEN TRIM(status) = 'เสร็จสิ้น' THEN 1 ELSE 0 END) as completed
    FROM repairs
    GROUP BY type
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Format output to be easy for client to map
    const stats = {
      repair: rows.find(r => r.type === 'repair') || { total: 0, pending: 0, in_progress: 0, on_hold: 0, completed: 0 },
      claim: rows.find(r => r.type === 'claim') || { total: 0, pending: 0, in_progress: 0, on_hold: 0, completed: 0 }
    };
    res.json(stats);
  });
};

exports.getRepairById = (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM repairs WHERE id = ?', [id], (err, repair) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!repair) return res.status(404).json({ message: 'ไม่พบข้อมูล' });

    db.all('SELECT * FROM repair_logs WHERE repair_id = ? ORDER BY created_at DESC', [id], (err, logs) => {
      db.all('SELECT * FROM repair_images WHERE repair_id = ?', [id], (err, images) => {
        db.all('SELECT * FROM device_changes WHERE repair_id = ?', [id], (err, devices) => {
          res.json({ ...repair, logs, images, devices });
        });
      });
    });
  });
};

exports.createRepair = (req, res) => {
  const { reporter, location, device_name, problem, priority, received_at } = req.body;
  const ticket_no = generateTicketNo();

  db.run(`
    INSERT INTO repairs (ticket_no, reporter, location, device_name, problem, priority, status, is_read, type, received_at)
    VALUES (?, ?, ?, ?, ?, ?, 'รอดำเนินการ', 0, 'repair', ?)
  `, [ticket_no, reporter, location, device_name, problem, priority || 'ปกติ', received_at || new Date().toISOString()], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    const repairId = this.lastID;
    
    // Log creation
    db.run('INSERT INTO repair_logs (repair_id, action, user, note) VALUES (?, ?, ?, ?)', 
      [repairId, 'เปิดตั๋วแจ้งซ่อม', reporter, 'ส่งข้อมูลแจ้งซ่อมใหม่เข้าสู่ระบบ']);

    // Handle images if any
    if (req.files && req.files.length > 0) {
      const stmt = db.prepare('INSERT INTO repair_images (repair_id, file_path, image_type) VALUES (?, ?, ?)');
      req.files.forEach(file => {
        stmt.run(repairId, file.path, 'รูปก่อนซ่อม');
      });
      stmt.finalize();
    }

    res.status(201).json({ id: repairId, ticket_no });
  });
};

exports.createClaim = (req, res) => {
  const { reporter, location, device_name, problem, priority, received_at } = req.body;
  const ticket_no = generateTicketNo();

  db.run(`
    INSERT INTO repairs (ticket_no, reporter, location, device_name, problem, priority, status, is_read, type, received_at)
    VALUES (?, ?, ?, ?, ?, ?, 'รอดำเนินการ', 0, 'claim', ?)
  `, [ticket_no, reporter, location, device_name, problem, priority || 'ปกติ', received_at || new Date().toISOString()], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    const repairId = this.lastID;
    
    // Log creation
    db.run('INSERT INTO repair_logs (repair_id, action, user, note) VALUES (?, ?, ?, ?)', 
      [repairId, 'เปิดตั๋วแจ้งเคลม', reporter, 'ส่งข้อมูลแจ้งเคลมใหม่เข้าสู่ระบบ']);

    // Handle images if any
    if (req.files && req.files.length > 0) {
      const stmt = db.prepare('INSERT INTO repair_images (repair_id, file_path, image_type) VALUES (?, ?, ?)');
      req.files.forEach(file => {
        stmt.run(repairId, file.path, 'รูปก่อนเคลม');
      });
      stmt.finalize();
    }

    res.status(201).json({ id: repairId, ticket_no });
  });
};

exports.markAsRead = (req, res) => {
  const { id } = req.params;
  db.run('UPDATE repairs SET is_read = 1 WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Marked as read' });
  });
};

exports.updateStatus = (req, res) => {
  const { id } = req.params;
  const { status, user, note, technician, repair_note } = req.body;

  let query = 'UPDATE repairs SET status = ?, updated_at = CURRENT_TIMESTAMP';
  const params = [status];

  if (technician) {
    query += ', technician = ?';
    params.push(technician);
  }

  if (repair_note) {
    query += ', repair_note = ?';
    params.push(repair_note);
  }

  query += ' WHERE id = ?';
  params.push(id);

  db.run(query, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    const logUser = technician || user || 'ระบบ';
    const logNote = repair_note || note || '';

    db.run('INSERT INTO repair_logs (repair_id, action, user, note) VALUES (?, ?, ?, ?)', 
      [id, `เปลี่ยนสถานะเป็น ${status}`, logUser, logNote]);

    res.json({ message: 'อัปเดตสถานะเรียบร้อย' });
  });
};

exports.updateRepair = (req, res) => {
  const { id } = req.params;
  const { reporter, location, device_name, problem, priority } = req.body;

  db.run(`
    UPDATE repairs 
    SET reporter = ?, location = ?, device_name = ?, problem = ?, priority = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [reporter, location, device_name, problem, priority, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    db.run('INSERT INTO repair_logs (repair_id, action, user, note) VALUES (?, ?, ?, ?)', 
      [id, 'แก้ไขข้อมูลใบแจ้งซ่อม', 'แอดมิน/ช่าง', 'แก้ไขรายละเอียดพื้นฐานของใบแจ้งซ่อม']);

    res.json({ message: 'แก้ไขข้อมูลเรียบร้อย' });
  });
};

exports.replaceDevice = (req, res) => {
  const { id } = req.params;
  const { old_serial, old_model, new_serial, new_model, technician } = req.body;

  db.run(`
    INSERT INTO device_changes (repair_id, old_serial, old_model, new_serial, new_model, changed_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [id, old_serial, old_model, new_serial, new_model, technician], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    db.run('INSERT INTO repair_logs (repair_id, action, user, note) VALUES (?, ?, ?, ?)', 
      [id, 'เปลี่ยนอะไหล่/อุปกรณ์', technician, `เปลี่ยน ${old_model} (${old_serial}) เป็น ${new_model} (${new_serial})`]);

    res.json({ message: 'บันทึกการเปลี่ยนอะไหล่เรียบร้อย' });
  });
};

exports.deleteRepair = (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM repairs WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'ลบรายการแจ้งซ่อมสำเร็จ' });
  });
};
