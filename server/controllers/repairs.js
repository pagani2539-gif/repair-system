const db = require('../database/init');

// SQLite Query Helpers for Async/Await
const queryAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

const queryGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

// Helper to generate Ticket Number
const generateTicketNo = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RE-${date}-${random}`;
};

exports.getDashboardStats = async (req, res) => {
  const { startDate, endDate } = req.query;
  const params = [];
  let timeCondition = "1=1";

  if (startDate && endDate) {
    timeCondition = "created_at BETWEEN ? AND ?";
    params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
  } else if (startDate) {
    timeCondition = "created_at >= ?";
    params.push(`${startDate} 00:00:00`);
  } else if (endDate) {
    timeCondition = "created_at <= ?";
    params.push(`${endDate} 23:59:59`);
  }

  try {
    const [
      kpis,
      recentJobs,
      recentLogs,
      technicians,
      topUsed,
      leastUsed,
      criticalStock,
      mostBroken,
      overdue,
      monthlyTrend,
      recentTransactions,
      recentWithdrawals,
      withdrawalBreakdown,
      stockMovements,
      purchaseOrderKpis,
      purchaseOrderSpent,
      recentPurchaseOrders
    ] = await Promise.all([
      // 1. KPIs
      queryGet(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN TRIM(status) = 'รอดำเนินการ' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN TRIM(status) = 'กำลังซ่อม' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN TRIM(status) = 'เสร็จสิ้น' THEN 1 ELSE 0 END) as completed
        FROM repairs
        WHERE ${timeCondition}
      `, params),
      // 2. Recent Jobs
      queryAll("SELECT * FROM repairs ORDER BY created_at DESC LIMIT 10"),
      // 3. Recent Logs
      queryAll(`
        SELECT l.*, r.ticket_no, r.device_name 
        FROM repair_logs l
        JOIN repairs r ON l.repair_id = r.id
        ORDER BY l.created_at DESC LIMIT 10
      `),
      // 4. Technicians Workload
      queryAll(`
        SELECT 
          technician as name, 
          SUM(CASE WHEN TRIM(status) = 'เสร็จสิ้น' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN TRIM(status) != 'เสร็จสิ้น' THEN 1 ELSE 0 END) as active,
          COUNT(*) as total
        FROM repairs 
        WHERE technician IS NOT NULL AND technician != '' AND ${timeCondition}
        GROUP BY technician
        ORDER BY total DESC
      `, params),
      // 5. Top Used Items
      queryAll(`
        SELECT i.name, SUM(wi.quantity) as count
        FROM withdrawal_items wi
        JOIN inventory i ON wi.inventory_id = i.id
        JOIN withdrawals w ON wi.withdrawal_id = w.id
        WHERE w.created_at >= ? AND w.created_at <= ?
        GROUP BY wi.inventory_id
        ORDER BY count DESC LIMIT 5
      `, [startDate ? `${startDate} 00:00:00` : '1970-01-01', endDate ? `${endDate} 23:59:59` : '9999-12-31']),
      // 6. Least Used Items (Items with lowest or zero movement in withdrawals)
      queryAll(`
        SELECT name, 0 as count
        FROM inventory
        WHERE id NOT IN (SELECT DISTINCT inventory_id FROM withdrawal_items)
        LIMIT 5
      `),
      // 7. Critical Stock Count
      queryGet("SELECT COUNT(*) as count FROM inventory WHERE quantity < min_stock"),
      // 8. Most Broken Devices
      queryAll(`
        SELECT device_name as name, COUNT(*) as count
        FROM repairs
        WHERE ${timeCondition}
        GROUP BY device_name
        ORDER BY count DESC LIMIT 5
      `, params),
      // 9. Overdue (older than 3 days and not completed)
      queryAll(`
        SELECT ticket_no, device_name, reporter, created_at,
        CAST(julianday('now') - julianday(created_at) AS INTEGER) as days_over
        FROM repairs
        WHERE status != 'เสร็จสิ้น' AND created_at < datetime('now', '-3 days')
        ORDER BY days_over DESC LIMIT 5
      `),
      // 10. Monthly Trend (last 6 months)
      queryAll(`
        SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
        FROM repairs
        WHERE created_at > datetime('now', '-6 months')
        GROUP BY month
        ORDER BY month ASC
      `),
      // 11. Recent Transactions
      queryAll(`
        SELECT t.*, i.name as product_name
        FROM inventory_transactions t
        JOIN inventory i ON t.inventory_id = i.id
        ORDER BY t.created_at DESC LIMIT 10
      `),
      // 12. Recent Withdrawals
      queryAll("SELECT * FROM withdrawals ORDER BY created_at DESC LIMIT 10"),
      // 13. Withdrawal Breakdown by type/reason
      queryAll(`
        SELECT type as name, COUNT(*) as count
        FROM withdrawals
        WHERE ${timeCondition}
        GROUP BY type
        ORDER BY count DESC
      `, params),
      // 14. Stock Movements Trend over 6 months
      queryAll(`
        SELECT 
          strftime('%Y-%m', created_at) as month,
          SUM(CASE WHEN transaction_type = 'ADD_STOCK' THEN quantity_added ELSE 0 END) as added,
          SUM(CASE WHEN transaction_type = 'WITHDRAW' THEN quantity_withdrawn ELSE 0 END) as withdrawn,
          SUM(CASE WHEN transaction_type = 'BORROW' THEN quantity_borrowed ELSE 0 END) as borrowed,
          SUM(CASE WHEN transaction_type = 'RETURN' THEN quantity_returned ELSE 0 END) as returned
        FROM inventory_transactions
        WHERE created_at > datetime('now', '-6 months')
        GROUP BY month
        ORDER BY month ASC
      `),
      // 15. Purchase Order KPIs
      queryGet(`
        SELECT 
          COUNT(*) as total_po,
          SUM(CASE WHEN status IN ('Draft', 'Pending', 'Ordered') THEN 1 ELSE 0 END) as pending_po,
          SUM(CASE WHEN status = 'Received' THEN 1 ELSE 0 END) as received_po
        FROM purchase_orders
        WHERE ${timeCondition}
      `, params),
      // 16. PO Total Spent (Received POs)
      queryGet(`
        SELECT SUM(poi.quantity * poi.unit_price) as total_spent
        FROM purchase_order_items poi
        JOIN purchase_orders po ON poi.po_id = po.id
        WHERE po.status = 'Received' AND ${timeCondition === "1=1" ? "1=1" : timeCondition.replace(/created_at/g, 'po.created_at')}
      `, params),
      // 17. Recent POs
      queryAll(`
        SELECT po.*, SUM(poi.quantity * poi.unit_price) as total_cost, SUM(poi.quantity) as total_items
        FROM purchase_orders po
        LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
        GROUP BY po.id
        ORDER BY po.created_at DESC
        LIMIT 5
      `)
    ]);

    // Additional query for critical items list
    const criticalItems = await queryAll("SELECT name, quantity, min_stock FROM inventory WHERE quantity < min_stock ORDER BY (min_stock - quantity) DESC LIMIT 5");

    res.json({
      kpis: { 
        total: kpis.total || 0, 
        pending: kpis.pending || 0, 
        in_progress: kpis.in_progress || 0, 
        completed: kpis.completed || 0,
        critical_stock: criticalStock.count || 0
      },
      recentJobs,
      recentLogs,
      technicians,
      inventory: {
        topUsed,
        leastUsed,
        criticalItems,
        recentTransactions,
        recentWithdrawals
      },
      analysis: {
        mostBroken,
        overdue,
        monthlyTrend
      },
      withdrawalBreakdown,
      stockMovements,
      purchaseOrders: {
        total_po: purchaseOrderKpis.total_po || 0,
        pending_po: purchaseOrderKpis.pending_po || 0,
        received_po: purchaseOrderKpis.received_po || 0,
        total_spent: purchaseOrderSpent.total_spent || 0,
        recentPurchaseOrders
      }
    });
  } catch (err) {
    console.error('Dashboard Stats Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getUnreadCount = (req, res) => {
  db.all("SELECT type, COUNT(*) as count FROM repairs WHERE is_read = 0 GROUP BY type", (err, rows) => {
    if (err) {
      console.error("Database error in getUnreadCount:", err);
      return res.status(500).json({ error: err.message });
    }
    
    db.get("SELECT COUNT(*) as count FROM inventory WHERE quantity < min_stock", (err2, invRow) => {
      if (err2) {
        console.error("Database error in getUnreadCount (inventory):", err2);
        return res.status(500).json({ error: err2.message });
      }
      
      const repairUnread = (rows && rows.find(r => r.type === 'repair')?.count) || 0;
      const claimUnread = (rows && rows.find(r => r.type === 'claim')?.count) || 0;
      const lowStock = (invRow && invRow.count) || 0;
      
      console.log("Unread count from DB: repair =", repairUnread, ", claim =", claimUnread, ", lowStock =", lowStock);
      res.json({ 
        repair: repairUnread, 
        claim: claimUnread, 
        lowStock: lowStock,
        total: repairUnread + claimUnread,
        count: repairUnread + claimUnread
      });
    });
  });
};

exports.getAllRepairs = (req, res) => {
  const { status, location, search, type, priority, sortBy } = req.query;
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

  if (location && location !== 'All' && location !== 'ทั้งหมด') {
    query += ' AND location = ?';
    params.push(location);
  }

  if (priority && priority !== 'All' && priority !== 'ทั้งหมด') {
    query += ' AND priority = ?';
    params.push(priority);
  }

  if (search) {
    query += ' AND (ticket_no LIKE ? OR reporter LIKE ? OR problem LIKE ? OR device_name LIKE ? OR location LIKE ? OR project_name LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
  }

  if (sortBy === 'oldest') {
    query += ' ORDER BY created_at ASC';
  } else if (sortBy === 'priority') {
    query += ' ORDER BY CASE priority WHEN \'วิกฤต\' THEN 1 WHEN \'ด่วนมาก\' THEN 2 WHEN \'ด่วน\' THEN 3 ELSE 4 END ASC, created_at DESC';
  } else {
    query += ' ORDER BY created_at DESC'; // default newest
  }

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
  const { reporter, location, device_name, problem, priority, received_at, project_name } = req.body;
  const ticket_no = generateTicketNo();

  db.run(`
    INSERT INTO repairs (ticket_no, reporter, location, device_name, problem, priority, status, is_read, type, received_at, project_name)
    VALUES (?, ?, ?, ?, ?, ?, 'รอดำเนินการ', 0, 'repair', ?, ?)
  `, [ticket_no, reporter, location, device_name, problem, priority || 'ปกติ', received_at || new Date().toISOString(), project_name], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    const repairId = this.lastID;
    
    // Log creation
    db.run('INSERT INTO repair_logs (repair_id, action, user, note) VALUES (?, ?, ?, ?)', 
      [repairId, 'เปิดตั๋วแจ้งซ่อม', reporter, 'ส่งข้อมูลแจ้งซ่อมใหม่เข้าสู่ระบบ']);

    // Handle images if any
    if (req.files && req.files.length > 0) {
      const stmt = db.prepare('INSERT INTO repair_images (repair_id, file_path, image_type) VALUES (?, ?, ?)');
      req.files.forEach(file => {
        stmt.run(repairId, file.filename, 'รูปก่อนซ่อม');
      });
      stmt.finalize();
    }

    res.status(201).json({ id: repairId, ticket_no });
  });
};

exports.createClaim = (req, res) => {
  const { reporter, location, device_name, problem, priority, received_at, project_name } = req.body;
  const ticket_no = generateTicketNo();

  db.run(`
    INSERT INTO repairs (ticket_no, reporter, location, device_name, problem, priority, status, is_read, type, received_at, project_name)
    VALUES (?, ?, ?, ?, ?, ?, 'รอดำเนินการ', 0, 'claim', ?, ?)
  `, [ticket_no, reporter, location, device_name, problem, priority || 'ปกติ', received_at || new Date().toISOString(), project_name], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    const repairId = this.lastID;
    
    // Log creation
    db.run('INSERT INTO repair_logs (repair_id, action, user, note) VALUES (?, ?, ?, ?)', 
      [repairId, 'เปิดตั๋วแจ้งเคลม', reporter, 'ส่งข้อมูลแจ้งเคลมใหม่เข้าสู่ระบบ']);

    // Handle images if any
    if (req.files && req.files.length > 0) {
      const stmt = db.prepare('INSERT INTO repair_images (repair_id, file_path, image_type) VALUES (?, ?, ?)');
      req.files.forEach(file => {
        stmt.run(repairId, file.filename, 'รูปก่อนเคลม');
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
  const { reporter, location, device_name, problem, priority, project_name } = req.body;

  db.run(`
    UPDATE repairs 
    SET reporter = ?, location = ?, device_name = ?, problem = ?, priority = ?, project_name = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [reporter, location, device_name, problem, priority, project_name, id], function(err) {
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
