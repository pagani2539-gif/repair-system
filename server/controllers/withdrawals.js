const db = require('../database/init');
const { logTransaction } = require('./transactions');
exports.getAllWithdrawals = (req, res) => {
  const query = `
    SELECT w.*, 
      (SELECT GROUP_CONCAT(i.name || ' x' || wi.quantity || (CASE WHEN wi.serial_numbers IS NOT NULL THEN ' [S/N: ' || wi.serial_numbers || ']' ELSE '' END)) 
       FROM withdrawal_items wi 
       JOIN inventory i ON wi.inventory_id = i.id 
       WHERE wi.withdrawal_id = w.id) as items_summary,
      (SELECT COUNT(*) FROM withdrawal_items wi 
       JOIN inventory i2 ON wi.inventory_id = i2.id
       WHERE wi.withdrawal_id = w.id 
       AND i2.requires_sn = 1
       AND (wi.serial_numbers IS NULL OR 
            (LENGTH(wi.serial_numbers) - LENGTH(REPLACE(wi.serial_numbers, ',', '')) + 1) < wi.quantity)
      ) as items_missing_sn
    FROM withdrawals w
    ORDER BY w.created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.createWithdrawal = (req, res) => {
  console.log('Received withdrawal request body:', req.body);
  const { recipient, type, note, items, project_name, location } = req.body; 

  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'กรุณาเลือกอุปกรณ์ที่ต้องการเบิก' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.run(`
      INSERT INTO withdrawals (recipient, type, note, project_name, location)
      VALUES (?, ?, ?, ?, ?)
    `, [recipient, type, note, project_name || null, location || null], function(err) {
      if (err) {
        console.error('Database INSERT error:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ error: err.message });
      }

      const withdrawalId = this.lastID;
      let completedCount = 0;
      let errorOccurred = false;

      items.forEach(item => {
        if (errorOccurred) return;

        // Check stock first
        db.get('SELECT name, quantity FROM inventory WHERE id = ?', [item.inventory_id], (err, invItem) => {
          if (err || !invItem || invItem.quantity < item.quantity) {
            errorOccurred = true;
            db.run('ROLLBACK');
            return res.status(400).json({ 
              message: invItem ? `อุปกรณ์ "${invItem.name}" คงเหลือไม่เพียงพอ` : 'ไม่พบข้อมูลอุปกรณ์บางรายการ' 
            });
          }

          // Insert withdrawal item with comma-separated serial numbers
          const serialNumbersStr = (item.serial_numbers && item.serial_numbers.length > 0) 
            ? item.serial_numbers.filter(sn => sn.trim() !== '').join(', ') 
            : null;

          db.run(`
            INSERT INTO withdrawal_items (withdrawal_id, inventory_id, quantity, serial_numbers)
            VALUES (?, ?, ?, ?)
          `, [withdrawalId, item.inventory_id, item.quantity, serialNumbersStr], (err) => {
            if (err) {
              errorOccurred = true;
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }

            // Update inventory
            db.run('UPDATE inventory SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
              [item.quantity, item.inventory_id], (err) => {
                if (err) {
                  errorOccurred = true;
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: err.message });
                }

                const providedSns = (item.serial_numbers || []).filter(sn => sn.trim() !== '');

                if (providedSns.length > 0) {
                  let snsDone = 0;
                  providedSns.forEach(sn => {
                    if (errorOccurred) return;
                    
                    db.get('SELECT id FROM inventory_instances WHERE serial_number = ?', [sn], (err, row) => {
                      if (err) {
                        errorOccurred = true;
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                      }
                      
                      const proceedWithTx = (instanceId) => {
                        logTransaction({
                          inventory_id: item.inventory_id,
                          instance_id: instanceId,
                          transaction_type: 'WITHDRAW',
                          quantity_withdrawn: 1,
                          project_name: project_name,
                          location: location,
                          user_name: recipient,
                          note: note,
                          withdrawal_id: withdrawalId
                        });
                        
                        snsDone++;
                        if (snsDone === providedSns.length) {
                          // Handle remaining quantity without S/N
                          const remainingQty = item.quantity - providedSns.length;
                          if (remainingQty > 0) {
                            logTransaction({
                              inventory_id: item.inventory_id,
                              transaction_type: 'WITHDRAW',
                              quantity_withdrawn: remainingQty,
                              project_name: project_name,
                              location: location,
                              user_name: recipient,
                              note: note ? `${note} (Remaining qty without S/N)` : '(Remaining qty without S/N)',
                              withdrawal_id: withdrawalId
                            });
                          }
                          
                          completedCount++;
                          checkCompletion();
                        }
                      };

                      if (row) {
                        const instanceId = row.id;
                        db.run(`UPDATE inventory_instances SET status = 'Withdrawn', current_location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                          [location || project_name || 'Withdrawn', instanceId], (err) => {
                            if (err) {
                              errorOccurred = true;
                              db.run('ROLLBACK');
                              return res.status(500).json({ error: err.message });
                            }
                            proceedWithTx(instanceId);
                          });
                      } else {
                        db.run(`INSERT INTO inventory_instances (inventory_id, serial_number, status, current_location) VALUES (?, ?, 'Withdrawn', ?)`,
                          [item.inventory_id, sn, location || project_name || 'Withdrawn'], function(err) {
                            if (err) {
                              errorOccurred = true;
                              db.run('ROLLBACK');
                              return res.status(500).json({ error: err.message });
                            }
                            proceedWithTx(this.lastID);
                          });
                      }
                    });
                  });
                } else {
                  // No S/Ns provided, log as bulk
                  logTransaction({
                    inventory_id: item.inventory_id,
                    transaction_type: 'WITHDRAW',
                    quantity_withdrawn: item.quantity,
                    project_name: project_name,
                    location: location,
                    user_name: recipient,
                    note: note,
                    withdrawal_id: withdrawalId
                  });
                  completedCount++;
                  checkCompletion();
                }

                function checkCompletion() {
                  if (completedCount === items.length && !errorOccurred) {
                    db.run('COMMIT');
                    // Check and auto generate POs for low stock items in background
                    const { checkAndGenerateAutoPOs } = require('../utils/autoPo');
                    checkAndGenerateAutoPOs((autoPoErr) => {
                      if (autoPoErr) console.error('Error auto-generating POs after withdrawal:', autoPoErr.message);
                    });
                    res.status(201).json({ id: withdrawalId, message: 'บันทึกการเบิกเรียบร้อย' });
                  }
                }
              });
          });
        });
      });
    });
  });
};

exports.updateItemSerialNumbers = (req, res) => {
  const { id, itemId } = req.params;
  const { serial_numbers } = req.body; // Expecting an array of new S/Ns

  if (!serial_numbers || !Array.isArray(serial_numbers) || serial_numbers.length === 0) {
    return res.status(400).json({ message: 'กรุณาระบุ Serial Numbers' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 1. Get the current item info
    db.get('SELECT wi.*, w.recipient, w.project_name, w.location, w.note FROM withdrawal_items wi JOIN withdrawals w ON wi.withdrawal_id = w.id WHERE wi.id = ? AND wi.withdrawal_id = ?', [itemId, id], (err, item) => {
      if (err || !item) {
        db.run('ROLLBACK');
        return res.status(404).json({ message: 'ไม่พบรายการเบิกที่ต้องการแก้ไข' });
      }

      const existingSns = item.serial_numbers ? item.serial_numbers.split(', ').filter(s => s.trim() !== '') : [];
      const newSns = serial_numbers.filter(sn => sn.trim() !== '' && !existingSns.includes(sn));
      
      if (existingSns.length + newSns.length > item.quantity) {
        db.run('ROLLBACK');
        return res.status(400).json({ message: `จำนวน S/N รวม (${existingSns.length + newSns.length}) เกินกว่าจำนวนที่เบิก (${item.quantity})` });
      }

      const updatedSnsStr = [...existingSns, ...newSns].join(', ');

      // 2. Update withdrawal_items
      db.run('UPDATE withdrawal_items SET serial_numbers = ? WHERE id = ?', [updatedSnsStr, itemId], (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }

        let processed = 0;
        if (newSns.length === 0) {
          db.run('COMMIT');
          return res.json({ message: 'อัปเดตเรียบร้อย (ไม่มี S/N ใหม่)' });
        }

        newSns.forEach(sn => {
          // 3. Register/Update inventory_instances
          db.get('SELECT id FROM inventory_instances WHERE serial_number = ?', [sn], (err, row) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }

            const finalizeSn = (instanceId) => {
              // 4. Log Transaction
              logTransaction({
                inventory_id: item.inventory_id,
                instance_id: instanceId,
                transaction_type: 'WITHDRAW',
                quantity_withdrawn: 1,
                project_name: item.project_name,
                location: item.location,
                user_name: item.recipient,
                note: `ระบุ S/N ย้อนหลังสำหรับการเบิก #${id}`,
                withdrawal_id: id
              });

              processed++;
              if (processed === newSns.length) {
                db.run('COMMIT');
                res.json({ message: 'ระบุ Serial Numbers ย้อนหลังเรียบร้อยแล้ว' });
              }
            };

            if (row) {
              db.run(`UPDATE inventory_instances SET status = 'Withdrawn', current_location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [item.location || item.project_name || 'Withdrawn', row.id], (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                  }
                  finalizeSn(row.id);
                });
            } else {
              db.run(`INSERT INTO inventory_instances (inventory_id, serial_number, status, current_location) VALUES (?, ?, 'Withdrawn', ?)`,
                [item.inventory_id, sn, item.location || item.project_name || 'Withdrawn'], function(err) {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                  }
                  finalizeSn(this.lastID);
                });
            }
          });
        });
      });
    });
  });
};

exports.getWithdrawalById = (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM withdrawals WHERE id = ?', [id], (err, withdrawal) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!withdrawal) return res.status(404).json({ message: 'ไม่พบข้อมูลการเบิก' });

    const itemsQuery = `
      SELECT wi.*, i.name as item_name, i.model as item_model, i.description as item_description, i.image_path as item_image, i.requires_sn
      FROM withdrawal_items wi
      JOIN inventory i ON wi.inventory_id = i.id
      WHERE wi.withdrawal_id = ?
    `;
    
    db.all(itemsQuery, [id], (err, items) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ...withdrawal, items });
    });
  });
};

exports.deleteWithdrawal = (req, res) => {
  const { id } = req.params;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 1. Get items to return to stock
    db.all('SELECT inventory_id, quantity FROM withdrawal_items WHERE withdrawal_id = ?', [id], (err, items) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: err.message });
      }

      let completedCount = 0;
      if (items.length === 0) {
        // No items, just delete the withdrawal record
        db.run('DELETE FROM withdrawals WHERE id = ?', [id], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }
          db.run('COMMIT');
          return res.json({ message: 'ลบประวัติการเบิกเรียบร้อย' });
        });
        return;
      }

      // 2. Return each item to inventory
      items.forEach(item => {
        db.run('UPDATE inventory SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
          [item.quantity, item.inventory_id], (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }

            completedCount++;
            if (completedCount === items.length) {
              // 3. Delete the withdrawal (cascade will handle withdrawal_items)
              db.run('DELETE FROM withdrawals WHERE id = ?', [id], function(err) {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: err.message });
                }
                db.run('COMMIT');
                res.json({ message: 'ยกเลิกการเบิกและคืนสต็อกเรียบร้อย' });
              });
            }
          });
      });
    });
  });
};
