const db = require('../database/init');

exports.getAllItems = (req, res) => {
  const { search } = req.query;
  let query = 'SELECT * FROM inventory WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR model LIKE ? OR description LIKE ? OR storage_location LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  query += ' ORDER BY created_at DESC, id DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.getItemById = (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM inventory WHERE id = ?', [id], (err, item) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!item) return res.status(404).json({ message: 'ไม่พบข้อมูลอุปกรณ์' });
    res.json(item);
  });
};

exports.createItem = (req, res) => {
  const { name, model, description, quantity, min_stock, serial_numbers, requires_sn, storage_location, unit_price, warranty_months } = req.body;
  const image_path = req.file ? req.file.filename : null;
  const parsedSns = serial_numbers ? JSON.parse(serial_numbers) : [];
  const qty = parseInt(quantity) || 0;
  const reqSn = requires_sn === undefined ? 1 : parseInt(requires_sn);
  const price = parseFloat(unit_price) || 0;
  const warranty = parseInt(warranty_months) || 36;

  db.run(`
    INSERT INTO inventory (name, model, description, quantity, min_stock, image_path, requires_sn, storage_location, unit_price, warranty_months)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [name, model, description, qty, min_stock || 10, image_path, reqSn, storage_location || null, price, warranty], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    const inventoryId = this.lastID;

    // Handle Serial Numbers if provided
    if (parsedSns.length > 0) {
      const placeholders = parsedSns.map(() => '(?, ?, "New", "In Stock")').join(', ');
      const params = [];
      parsedSns.forEach(sn => {
        params.push(inventoryId, sn);
      });

      db.run(`
        INSERT INTO inventory_instances (inventory_id, serial_number, condition, status)
        VALUES ${placeholders}
      `, params, (err2) => {
        if (err2) console.error('Error inserting instances:', err2.message);
        
        // Always add transaction log
        db.run(`
          INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity_added, note)
          VALUES (?, "ADD_STOCK", ?, "เพิ่มอุปกรณ์ใหม่เข้าระบบพร้อม S/N")
        `, [inventoryId, qty], (err3) => {
          if (err3) console.error('Error logging transaction:', err3.message);
          res.status(201).json({ id: inventoryId, message: 'เพิ่มอุปกรณ์เรียบร้อยพร้อมหมายเลข Serial Number' });
        });
      });
    } else {
      // No S/Ns, just log transaction and return
      db.run(`
        INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity_added, note)
        VALUES (?, "ADD_STOCK", ?, "เพิ่มอุปกรณ์ใหม่เข้าระบบ")
      `, [inventoryId, qty], (err3) => {
        if (err3) console.error('Error logging transaction:', err3.message);
        res.status(201).json({ id: inventoryId, message: 'เพิ่มอุปกรณ์เรียบร้อย' });
      });
    }
  });
};

exports.updateItem = (req, res) => {
  const { id } = req.params;
  const { name, model, description, quantity, min_stock, requires_sn, storage_location, unit_price, warranty_months } = req.body;
  const price = parseFloat(unit_price) || 0;
  const warranty = parseInt(warranty_months) || 36;
  
  let query = 'UPDATE inventory SET name = ?, model = ?, description = ?, quantity = ?, min_stock = ?, requires_sn = ?, storage_location = ?, unit_price = ?, warranty_months = ?, updated_at = CURRENT_TIMESTAMP';
  const params = [name, model, description, quantity, min_stock, requires_sn === undefined ? 1 : parseInt(requires_sn), storage_location || null, price, warranty];

  if (req.file) {
    query += ', image_path = ?';
    params.push(req.file.filename);
  }

  query += ' WHERE id = ?';
  params.push(id);

  db.run(query, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // Check and auto generate POs for low stock items in background
    const { checkAndGenerateAutoPOs } = require('../utils/autoPo');
    checkAndGenerateAutoPOs((autoPoErr) => {
      if (autoPoErr) console.error('Error auto-generating POs after inventory update:', autoPoErr.message);
    });

    res.json({ message: 'อัปเดตข้อมูลอุปกรณ์เรียบร้อย' });
  });
};

exports.deleteItem = (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM inventory WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'ลบอุปกรณ์เรียบร้อย' });
  });
};

exports.getStats = (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_items,
      SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN quantity > 0 AND quantity < 20 THEN 1 ELSE 0 END) as warning,
      SUM(CASE WHEN quantity >= 40 THEN 1 ELSE 0 END) as optimal
    FROM inventory
  `;
  db.get(query, [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || { total_items: 0, critical: 0, warning: 0, optimal: 0 });
  });
};

exports.getInstancesInStock = (req, res) => {
  const { id } = req.params;
  db.all(
    "SELECT id, serial_number, condition FROM inventory_instances WHERE inventory_id = ? AND status = 'In Stock'",
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
};

const VALID_CONDITIONS = ['New', 'Good', 'Fair', 'Broken'];

exports.updateInstanceCondition = (req, res) => {
  const { instanceId } = req.params;
  const { condition } = req.body;

  if (!condition || !VALID_CONDITIONS.includes(condition)) {
    return res.status(400).json({ message: `สภาพไม่ถูกต้อง (ต้องเป็น ${VALID_CONDITIONS.join(', ')})` });
  }

  db.run(
    "UPDATE inventory_instances SET condition = ? WHERE id = ?",
    [condition, instanceId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ message: 'ไม่พบชิ้นงาน (instance) นี้' });
      res.json({ message: 'อัปเดตสภาพชิ้นงานเรียบร้อยแล้ว', condition });
    }
  );
};

exports.addInventorySerialNumbers = (req, res) => {
  const { id } = req.params;
  const { serial_numbers } = req.body; // Array of S/Ns

  if (!serial_numbers || !Array.isArray(serial_numbers) || serial_numbers.length === 0) {
    return res.status(400).json({ message: 'กรุณาระบุ Serial Numbers' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Check if adding these S/Ns exceeds the current quantity
    db.get('SELECT quantity, name FROM inventory WHERE id = ?', [id], (err, inv) => {
      if (err || !inv) {
        db.run('ROLLBACK');
        return res.status(404).json({ message: 'ไม่พบข้อมูลอุปกรณ์' });
      }

      db.get('SELECT COUNT(*) as count FROM inventory_instances WHERE inventory_id = ? AND status = "In Stock"', [id], (err, countRow) => {
        const registeredCount = countRow.count || 0;
        if (registeredCount + serial_numbers.length > inv.quantity) {
          db.run('ROLLBACK');
          return res.status(400).json({ 
            message: `ไม่สามารถเพิ่ม S/N ได้ เนื่องจากจะเกินจำนวนของในคลัง (มี ${inv.quantity} ชิ้น, ลงทะเบียนแล้ว ${registeredCount} ชิ้น, กำลังเพิ่มอีก ${serial_numbers.length} ชิ้น)` 
          });
        }

        const placeholders = serial_numbers.map(() => '(?, ?, "New", "In Stock")').join(', ');
        const params = [];
        serial_numbers.forEach(sn => params.push(id, sn));

        db.run(`
          INSERT INTO inventory_instances (inventory_id, serial_number, condition, status)
          VALUES ${placeholders}
        `, params, (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }

          db.run(`
            INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity_added, note)
            VALUES (?, "ADD_STOCK", 0, "ลงทะเบียน Serial Numbers ย้อนหลัง")
          `, [id], (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }

            db.run('COMMIT');
            res.json({ message: 'ลงทะเบียน Serial Numbers เรียบร้อยแล้ว' });
          });
        });
      });
    });
  });
};

exports.getLifecycleReport = (req, res) => {
  const query = `
    SELECT 
      ii.id as instance_id,
      ii.serial_number,
      ii.status,
      ii.current_location,
      ii.station_id,
      ii.created_at as installed_at,
      i.id as inventory_id,
      i.name as device_name,
      i.model,
      i.unit_price,
      i.warranty_months,
      st.name as station_name,
      st.code as station_code,
      COALESCE((
        SELECT SUM(wi.quantity * i.unit_price)
        FROM withdrawal_items wi
        JOIN withdrawals w ON wi.withdrawal_id = w.id
        WHERE wi.inventory_id = i.id 
          AND w.station_id = ii.station_id
      ), 0) as total_repair_cost
    FROM inventory_instances ii
    JOIN inventory i ON ii.inventory_id = i.id
    LEFT JOIN stations st ON ii.station_id = st.id
    WHERE ii.status = 'Withdrawn' AND ii.station_id IS NOT NULL
    ORDER BY ii.created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const reports = rows.map(row => {
      const installedDate = new Date(row.installed_at);
      const currentDate = new Date();
      const ageMonths = Math.max(0, (currentDate.getFullYear() - installedDate.getFullYear()) * 12 + (currentDate.getMonth() - installedDate.getMonth()));
      const warranty = row.warranty_months || 36;
      const unitPrice = row.unit_price || 0;
      const totalCost = row.total_repair_cost || 0;

      const isExpiredWarranty = ageMonths > warranty;
      const costExceedsThreshold = unitPrice > 0 ? (totalCost / unitPrice) > 0.7 : false;
      const recommendedReplacement = isExpiredWarranty || costExceedsThreshold;

      return {
        ...row,
        age_months: ageMonths,
        is_expired_warranty: isExpiredWarranty,
        cost_exceeds_threshold: costExceedsThreshold,
        recommended_replacement: recommendedReplacement
      };
    });

    res.json(reports);
  });
};

