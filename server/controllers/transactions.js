const db = require('../database/init');
const { logAudit } = require('../utils/auditLogger');

// Helper to log a transaction
const logTransaction = (data, callback) => {
  const {
    inventory_id,
    instance_id = null,
    transaction_type,
    quantity_added = 0,
    quantity_withdrawn = 0,
    quantity_borrowed = 0,
    quantity_returned = 0,
    project_name = null,
    location = null,
    station_id = null,
    user_name = null,
    note = null,
    withdrawal_id = null,
    return_image = null
  } = data;

  db.run(`
    INSERT INTO inventory_transactions (
      inventory_id, instance_id, transaction_type, 
      quantity_added, quantity_withdrawn, quantity_borrowed, quantity_returned,
      project_name, location, station_id, user_name, note, withdrawal_id, return_image
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? IS NOT NULL THEN (SELECT name FROM stations WHERE id = ?) ELSE ? END, ?, ?, ?, ?, ?)
  `, [
    inventory_id, instance_id, transaction_type,
    quantity_added, quantity_withdrawn, quantity_borrowed, quantity_returned,
    project_name, station_id || null, station_id || null, location, station_id || null, user_name, note, withdrawal_id, return_image
  ], function(err) {
    if (!err) {
      logAudit('inventory_transaction', this.lastID, 'inventory movement', null, data, user_name || 'System').catch(e => console.error(e));
    }
    if (callback) callback(err, this.lastID);
  });
};

exports.getAllTransactions = (req, res) => {
  const { inventory_id, station_id, withdrawal_id } = req.query;
  let query = `
    SELECT *
    FROM transactions_view
  `;
  const params = [];
  let conditions = [];
  if (inventory_id) {
    conditions.push(`inventory_id = ?`);
    params.push(inventory_id);
  }
  if (station_id) {
    conditions.push(`station_id = ?`);
    params.push(station_id);
  }
  if (withdrawal_id) {
    conditions.push(`withdrawal_id = ?`);
    params.push(withdrawal_id);
  }
  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ');
  }
  query += ` ORDER BY created_at DESC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.addStock = (req, res) => {
  const { inventory_id, quantity, note, serial_numbers } = req.body; // serial_numbers is an array of strings
  const user_name = req.user.full_name;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 1. Update main inventory quantity
    db.run('UPDATE inventory SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      [quantity, inventory_id], (err) => {
      if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }

      // 2. If serial numbers provided, create instances
      if (serial_numbers && serial_numbers.length > 0) {
        let processed = 0;
        serial_numbers.forEach(sn => {
          db.run(`INSERT INTO inventory_instances (inventory_id, serial_number, status) VALUES (?, ?, 'In Stock')`, 
            [inventory_id, sn], (err) => {
            processed++;
            if (processed === serial_numbers.length) {
              // 3. Log the transaction
              logTransaction({
                inventory_id,
                transaction_type: 'ADD_STOCK',
                quantity_added: quantity,
                user_name,
                note: note || `Added ${quantity} units (with S/N)`
              }, (err) => {
                if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
                db.run('COMMIT');
                res.json({ message: 'นำเข้าสต็อกเรียบร้อย' });
              });
            }
          });
        });
      } else {
        // Bulk add
        logTransaction({
          inventory_id,
          transaction_type: 'ADD_STOCK',
          quantity_added: quantity,
          user_name,
          note
        }, (err) => {
          if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
          db.run('COMMIT');
          res.json({ message: 'นำเข้าสต็อกเรียบร้อย' });
        });
      }
    });
  });
};

exports.borrowItem = (req, res) => {
  const { inventory_id, instance_id, quantity, project_name, location, station_id, note } = req.body;
  const user_name = req.user.full_name;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 1. Check stock
    db.get('SELECT quantity FROM inventory WHERE id = ?', [inventory_id], (err, item) => {
      if (err || !item || item.quantity < quantity) {
        db.run('ROLLBACK');
        return res.status(400).json({ message: 'สต็อกไม่เพียงพอ' });
      }

      // 2. Update inventory
      db.run('UPDATE inventory SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
        [quantity, inventory_id], (err) => {
        if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }

        // 3. Update instance status if provided
        if (instance_id) {
          db.run(`UPDATE inventory_instances SET status = 'Borrowed', current_location = ?, station_id = ? WHERE id = ?`, 
            [location, station_id || null, instance_id], (err) => {
            if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
            
            // 4. Log transaction
            logTransaction({
              inventory_id, instance_id, transaction_type: 'BORROW',
              quantity_borrowed: quantity, user_name, project_name, location, station_id, note
            }, (err) => {
              if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
              db.run('COMMIT');
              const { checkAndGenerateAutoPOs } = require('../utils/autoPo');
              checkAndGenerateAutoPOs((autoPoErr) => {
                if (autoPoErr) console.error('Error auto-generating POs after borrow:', autoPoErr.message);
              });
              res.json({ message: 'บันทึกการยืมเรียบร้อย' });
            });
          });
        } else {
          // Bulk borrow
          logTransaction({
            inventory_id, transaction_type: 'BORROW',
            quantity_borrowed: quantity, user_name, project_name, location, station_id, note
          }, (err) => {
            if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
            db.run('COMMIT');
            const { checkAndGenerateAutoPOs } = require('../utils/autoPo');
            checkAndGenerateAutoPOs((autoPoErr) => {
              if (autoPoErr) console.error('Error auto-generating POs after borrow (bulk):', autoPoErr.message);
            });
            res.json({ message: 'บันทึกการยืมเรียบร้อย' });
          });
        }
      });
    });
  });
};

exports.returnItem = (req, res) => {
  const { inventory_id, instance_id, quantity, condition, note, transaction_id } = req.body;
  const user_name = req.user.full_name;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    let withdrawal_id = null;
    let original_station_id = null;
    let original_project_name = null;
    let original_location = null;

    const return_image = req.file ? req.file.filename : null;

    // 1. If transaction_id provided, mark original as RETURNED
    const finalizeReturn = () => {
      // 2. Update inventory
      db.run('UPDATE inventory SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [quantity, inventory_id], (err) => {
        if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }

        // 3. Update instance status if provided
        if (instance_id) {
          db.run(`UPDATE inventory_instances SET status = 'In Stock', condition = ?, current_location = 'Warehouse', station_id = NULL WHERE id = ?`,
            [condition || 'Good', instance_id], (err) => {
            if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }

            // 4. Log transaction (inherit station_id/project from original so it appears in station history)
            logTransaction({
              inventory_id, instance_id, transaction_type: 'RETURN',
              quantity_returned: quantity, user_name, note: note || `Returned in ${condition} condition`,
              withdrawal_id, return_image,
              station_id: original_station_id,
              project_name: original_project_name,
              location: original_location
            }, (err) => {
              if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
              db.run('COMMIT');
              res.json({ message: 'บันทึกการคืนเรียบร้อย' });
            });
          });
        } else {
          // Bulk return
          logTransaction({
            inventory_id, transaction_type: 'RETURN',
            quantity_returned: quantity, user_name, note,
            withdrawal_id, return_image,
            station_id: original_station_id,
            project_name: original_project_name,
            location: original_location
          }, (err) => {
            if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
            db.run('COMMIT');
            res.json({ message: 'บันทึกการคืนเรียบร้อย' });
          });
        }
      });
    };

    if (transaction_id) {
      db.get('SELECT withdrawal_id, station_id, project_name, location FROM inventory_transactions WHERE id = ?', [transaction_id], (err, row) => {
        if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
        if (row) {
          withdrawal_id = row.withdrawal_id;
          original_station_id = row.station_id;
          original_project_name = row.project_name;
          original_location = row.location;
        }
        db.run(`UPDATE inventory_transactions SET status = 'RETURNED' WHERE id = ? AND transaction_type IN ('BORROW', 'WITHDRAW')`, [transaction_id], (err) => {
          if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
          finalizeReturn();
        });
      });
    } else {
      finalizeReturn();
    }
  });
};

exports.getLatestTransaction = (req, res) => {
  const query = `
    SELECT t.id, t.transaction_type, t.quantity_added, t.quantity_withdrawn, t.quantity_borrowed, t.quantity_returned,
           i.name as product_name, t.user_name
    FROM inventory_transactions t
    JOIN inventory i ON t.inventory_id = i.id
    ORDER BY t.id DESC LIMIT 1
  `;
  db.get(query, [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || null);
  });
};

exports.deleteTransaction = (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM inventory_transactions WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ message: 'ไม่พบรายการที่ต้องการลบ' });
    res.json({ message: 'ลบรายการเรียบร้อยแล้ว' });
  });
};

exports.logTransaction = logTransaction; // Export for use in other controllers
