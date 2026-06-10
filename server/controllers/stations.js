const db = require('../database/init');
const { logAudit } = require('../utils/auditLogger');

// SQLite Query Helpers for Async/Await
const queryAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

const queryGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

exports.getUniqueStations = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT * FROM stations`;
    const params = [];
    if (status !== undefined) {
      query += ` WHERE status = ?`;
      params.push(status);
    }
    query += ` ORDER BY name ASC`;
    const rows = await queryAll(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Get Unique Stations Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getStationDetails = async (req, res) => {
  try {
    const { location, station_id } = req.query;
    
    let station = null;
    if (station_id) {
      station = await queryGet('SELECT * FROM stations WHERE id = ?', [station_id]);
    } else if (location && location.trim() !== '') {
      station = await queryGet('SELECT * FROM stations WHERE name = ?', [location.trim()]);
    }

    if (!station) {
      // Fallback if no station is found (e.g. legacy name search)
      station = { name: location || 'ไม่ระบุ', code: 'N/A', province: 'N/A', region: 'N/A', id: null };
    }

    const [
      repairs,
      claims,
      withdrawals,
      transactions,
      stats
    ] = await Promise.all([
      // 1. Repairs at this station
      queryAll(`
        SELECT *
        FROM repairs_view
        WHERE (station_id = ? OR (station_id IS NULL AND location_snapshot = ?)) AND type = 'repair'
        ORDER BY created_at DESC, id DESC
      `, [station.id, station.name]),

      // 2. Claims at this station
      queryAll(`
        SELECT *
        FROM repairs_view
        WHERE (station_id = ? OR (station_id IS NULL AND location_snapshot = ?)) AND type = 'claim'
        ORDER BY created_at DESC, id DESC
      `, [station.id, station.name]),

      // 3. Withdrawals at this station
      queryAll(`
        SELECT *
        FROM withdrawals_view
        WHERE station_id = ? OR (station_id IS NULL AND location_snapshot = ?)
        ORDER BY created_at DESC, id DESC
      `, [station.id, station.name]),

      // 4. Inventory Transactions at this station
      queryAll(`
        SELECT *
        FROM transactions_view
        WHERE station_id = ? OR (station_id IS NULL AND location_snapshot = ?)
        ORDER BY created_at DESC, id DESC
      `, [station.id, station.name]),

      // 5. Overall Stats for this station
      queryGet(`
        SELECT 
          COUNT(CASE WHEN type = 'repair' THEN 1 END) as repair_total,
          COUNT(CASE WHEN type = 'claim' THEN 1 END) as claim_total,
          SUM(CASE WHEN TRIM(status) = 'รอดำเนินการ' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN TRIM(status) = 'กำลังซ่อม' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN TRIM(status) = 'รออะไหล่' THEN 1 ELSE 0 END) as on_hold,
          SUM(CASE WHEN TRIM(status) = 'เสร็จสิ้น' THEN 1 ELSE 0 END) as completed
        FROM repairs
        WHERE station_id = ? OR (station_id IS NULL AND location = ?)
      `, [station.id, station.name])
    ]);

    // Fetch withdrawal items for withdrawals
    const withdrawalIds = withdrawals.map(w => w.id);
    let withdrawalItemsMap = {};
    
    if (withdrawalIds.length > 0) {
      const placeholders = withdrawalIds.map(() => '?').join(',');
      const items = await queryAll(`
        SELECT wi.*, i.name as item_name, i.model as item_model, i.description as item_description, i.image_path as item_image
        FROM withdrawal_items wi
        JOIN inventory i ON wi.inventory_id = i.id
        WHERE wi.withdrawal_id IN (${placeholders})
      `, withdrawalIds);

      // Group items by withdrawal_id
      items.forEach(item => {
        if (!withdrawalItemsMap[item.withdrawal_id]) {
          withdrawalItemsMap[item.withdrawal_id] = [];
        }
        withdrawalItemsMap[item.withdrawal_id].push(item);
      });
    }

    // Attach items to withdrawals
    const withdrawalsWithItems = withdrawals.map(w => ({
      ...w,
      items: withdrawalItemsMap[w.id] || []
    }));

    res.json({
      station: station,
      stats: {
        repair_total: stats.repair_total || 0,
        claim_total: stats.claim_total || 0,
        pending: stats.pending || 0,
        in_progress: stats.in_progress || 0,
        on_hold: stats.on_hold || 0,
        completed: stats.completed || 0,
        withdrawal_total: withdrawals.length
      },
      repairs,
      claims,
      withdrawals: withdrawalsWithItems,
      transactions
    });
  } catch (err) {
    console.error('Get Station Details Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getStationAreas = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await queryAll('SELECT * FROM station_areas WHERE station_id = ? AND status = 1 ORDER BY name ASC', [id]);
    res.json(rows);
  } catch (err) {
    console.error('Get Station Areas Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.createStation = async (req, res) => {
  const { name, station_type, highway_no, direction, region, province, responsible_person } = req.body;
  if (!name || !station_type || !highway_no || !direction || !region || !province || !responsible_person) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง (รวมถึง "ผู้รับผิดชอบสถานี")' });
  }

  try {
    const row = await queryGet('SELECT MAX(id) as maxId FROM stations');
    const maxId = row ? row.maxId : 0;
    const nextId = (maxId || 0) + 1;

    let shortDir = 'NONE';
    if (direction === 'INBOUND') shortDir = 'IN';
    else if (direction === 'OUTBOUND') shortDir = 'OUT';
    else if (direction === 'BOTH') shortDir = 'BOTH';
    else if (direction === 'NONE') shortDir = 'NONE';

    const code = `STN-${nextId}-${shortDir}`;

    db.run(`
      INSERT INTO stations (code, name, station_type, highway_no, direction, region, province, responsible_person)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [code, name.trim(), station_type, highway_no.trim(), direction, region, province, responsible_person.trim()], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'ชื่อสถานีนี้มีอยู่แล้วในระบบ' });
        }
        return res.status(500).json({ error: err.message });
      }
      
      const newId = this.lastID;
      
      // Seed default areas automatically for the new station depending on type
      let defaultAreas = [];
      const isWeighStation = station_type === 'WEIGH_STATION' || 
                             station_type.includes('WIM') || 
                             station_type.includes('ชั่งน้ำหนัก');
      if (isWeighStation) {
        defaultAreas = [
          'ช่องทางชั่งน้ำหนักหลัก',
          'ห้องควบคุมระบบคอมพิวเตอร์',
          'ลูปตรวจจับโลหะ ช่องทางที่ 1',
          'กล้อง ANPR (ทางเข้า)'
        ];
      } else {
        defaultAreas = [
          'ห้องควบคุม/ตู้ปฏิบัติงาน',
          'จุดตรวจค้น/ตรวจวัด',
          'กล้องวงจรปิด/กล้อง ANPR',
          'ลานจอดรถ/พื้นที่ไหล่ทาง'
        ];
      }
      
      const insertArea = db.prepare(`
        INSERT OR IGNORE INTO station_areas (station_id, name)
        VALUES (?, ?)
      `);
      
      defaultAreas.forEach((areaName) => {
        insertArea.run(newId, areaName);
      });
      
      insertArea.finalize((areaErr) => {
        if (areaErr) {
          console.error('Failed to seed default areas:', areaErr);
        }
        
        // Return the created station
        db.get('SELECT * FROM stations WHERE id = ?', [newId], (getErr, row) => {
          if (getErr) return res.status(500).json({ error: getErr.message });
          
          // Log audit
          logAudit('station', newId, 'create', null, row, 'System/Admin').catch(e => console.error(e));
          
          res.status(201).json(row);
        });
      });
    });
  } catch (err) {
    console.error('Create Station Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.createStationArea = (req, res) => {
  const { id } = req.params; // station_id
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'กรุณากรอกชื่อพื้นที่ย่อย' });
  }

  db.run(`
    INSERT INTO station_areas (station_id, name)
    VALUES (?, ?)
  `, [id, name.trim()], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'พื้นที่ย่อยนี้มีอยู่แล้วในสถานีนี้' });
      }
      return res.status(500).json({ error: err.message });
    }
    
    const newAreaId = this.lastID;
    db.get('SELECT * FROM station_areas WHERE id = ?', [newAreaId], (getErr, row) => {
      if (getErr) return res.status(500).json({ error: getErr.message });
      res.status(201).json(row);
    });
  });
};

exports.deleteStation = (req, res) => {
  const { id } = req.params;
  const deleted_by = 'System/Admin';
  
  db.get('SELECT * FROM stations WHERE id = ?', [id], (err, oldStation) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!oldStation) return res.status(404).json({ error: 'ไม่พบสถานีที่ต้องการลบ' });

    db.run(`
      UPDATE stations 
      SET status = 0, deleted_at = CURRENT_TIMESTAMP, deleted_by = ? 
      WHERE id = ?
    `, [deleted_by, id], function(err) {
      if (err) {
        console.error('Delete Station Error:', err);
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'ไม่พบสถานีที่ต้องการลบ' });
      }

      // Log audit
      logAudit('station', id, 'deactivate', oldStation, { ...oldStation, status: 0, deleted_at: new Date().toISOString() }, deleted_by).catch(e => console.error(e));

      res.json({ message: 'ปิดใช้งานสถานีเรียบร้อยแล้ว (Soft Delete)' });
    });
  });
};

exports.updateStation = async (req, res) => {
  const { id } = req.params;
  const { name, station_type, highway_no, direction, region, province, responsible_person } = req.body;

  if (!name || !station_type || !highway_no || !direction || !region || !province || !responsible_person) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง (รวมถึง "ผู้รับผิดชอบสถานี")' });
  }

  try {
    const oldStation = await queryGet('SELECT * FROM stations WHERE id = ?', [id]);
    if (!oldStation) return res.status(404).json({ error: 'ไม่พบสถานีที่ต้องการแก้ไข' });

    let shortDir = 'NONE';
    if (direction === 'INBOUND') shortDir = 'IN';
    else if (direction === 'OUTBOUND') shortDir = 'OUT';
    else if (direction === 'BOTH') shortDir = 'BOTH';
    else if (direction === 'NONE') shortDir = 'NONE';

    const code = `STN-${id}-${shortDir}`;

    db.run(`
      UPDATE stations
      SET code = ?, name = ?, station_type = ?, highway_no = ?, direction = ?, region = ?, province = ?, responsible_person = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [code, name.trim(), station_type, highway_no.trim(), direction, region, province, responsible_person.trim(), id], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'ชื่อสถานีนี้มีอยู่แล้วในระบบ' });
        }
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'ไม่พบสถานีที่ต้องการแก้ไข' });
      }

      db.get('SELECT * FROM stations WHERE id = ?', [id], (getErr, row) => {
        if (getErr) return res.status(500).json({ error: getErr.message });
        
        // Log audit
        logAudit('station', id, 'update', oldStation, row, 'System/Admin').catch(e => console.error(e));

        res.json(row);
      });
    });
  } catch (err) {
    console.error('Update Station Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getStationHealth = async (req, res) => {
  try {
    const [
      stationsCount,
      activeCount,
      inactiveCount,
      repairsCount,
      withdrawalsCount,
      transactionsCount
    ] = await Promise.all([
      queryGet('SELECT COUNT(*) as count FROM stations'),
      queryGet('SELECT COUNT(*) as count FROM stations WHERE status = 1'),
      queryGet('SELECT COUNT(*) as count FROM stations WHERE status = 0'),
      queryGet('SELECT COUNT(*), COUNT(station_id) as mapped FROM repairs'),
      queryGet('SELECT COUNT(*), COUNT(station_id) as mapped FROM withdrawals'),
      queryGet('SELECT COUNT(*), COUNT(station_id) as mapped FROM inventory_transactions')
    ]);

    const totalStations = stationsCount.count;
    const activeStations = activeCount.count;
    const inactiveStations = inactiveCount.count;

    const totalRepairs = repairsCount['COUNT(*)'];
    const mappedRepairs = repairsCount.mapped;
    const unmappedRepairs = totalRepairs - mappedRepairs;

    const totalWithdrawals = withdrawalsCount['COUNT(*)'];
    const mappedWithdrawals = withdrawalsCount.mapped;
    const unmappedWithdrawals = totalWithdrawals - mappedWithdrawals;

    const totalTransactions = transactionsCount['COUNT(*)'];
    const mappedTransactions = transactionsCount.mapped;
    const unmappedTransactions = totalTransactions - mappedTransactions;

    const totalRecords = totalRepairs + totalWithdrawals + totalTransactions;
    const mappedRecords = mappedRepairs + mappedWithdrawals + mappedTransactions;
    const dataQualityScore = totalRecords > 0 ? Math.round((mappedRecords / totalRecords) * 10000) / 100 : 100;

    res.json({
      totalStations,
      activeStations,
      inactiveStations,
      unmappedRepairs,
      unmappedWithdrawals,
      unmappedTransactions,
      dataQualityScore
    });
  } catch (err) {
    console.error('Get Station Health Error:', err);
    res.status(500).json({ error: err.message });
  }
};

