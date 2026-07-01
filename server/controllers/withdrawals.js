const db = require('../database/init');
const { logTransaction } = require('./transactions');
const { validateStationExists, validateStationAreaBelongsToStation, getStationSnapshotName } = require('../utils/stationValidation');
const { logAudit } = require('../utils/auditLogger');
const { sendLineNotify } = require('../utils/lineNotify');

const queryGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

/**
 * Send a LINE notification summarising a completed withdrawal.
 * Fires once per withdrawal (not per item) after the transaction is committed.
 */
const notifyWithdrawal = (withdrawalId) => {
  const sql = `
    SELECT w.recipient, w.type, w.project_name, w.location, w.note,
      (SELECT GROUP_CONCAT(i.name || ' x' || wi.quantity ||
         (CASE WHEN wi.serial_numbers IS NOT NULL THEN ' [S/N: ' || wi.serial_numbers || ']' ELSE '' END), '|||')
       FROM withdrawal_items wi
       JOIN inventory i ON wi.inventory_id = i.id
       WHERE wi.withdrawal_id = w.id) as items_summary
    FROM withdrawals w
    WHERE w.id = ?
  `;
  db.get(sql, [withdrawalId], (err, row) => {
    if (err) {
      console.error('Failed to build withdrawal LINE notification:', err.message);
      return;
    }
    if (!row) return;

    const itemsList = (row.items_summary || '')
      .split('|||')
      .filter(Boolean)
      .map(line => `• ${line}`)
      .join('\n');
    const place = row.project_name || row.location;

    let msg = `\n📦 *มีการเบิกอุปกรณ์*\n🔢 เลขที่ใบเบิก: #${withdrawalId}\n👤 ผู้เบิก: ${row.recipient || '-'}`;
    if (row.type) msg += `\n🛠️ ประเภท: ${row.type}`;
    if (place) msg += `\n📍 สถานที่: ${place}`;
    if (itemsList) msg += `\n📋 รายการอุปกรณ์:\n${itemsList}`;
    if (row.note) msg += `\n💬 หมายเหตุ: ${row.note}`;

    sendLineNotify('stock', msg);
  });
};

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
    FROM withdrawals_view w
    ORDER BY w.created_at DESC, w.id DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.createWithdrawal = async (req, res) => {
  const { type, note, items, project_name, location, station_id, station_area_id, return_due_date, contract_id } = req.body;
  const recipient = req.user.full_name;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'กรุณาเลือกอุปกรณ์ที่ต้องการเบิก' });
  }

  try {
    await validateStationExists(station_id);
    await validateStationAreaBelongsToStation(station_id, station_area_id);
    let officialLocation = (station_id ? await getStationSnapshotName(station_id) : null) || location;
    if (station_id && location && typeof location === 'string' && officialLocation && location.startsWith(officialLocation)) {
      officialLocation = location;
    }

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      db.run(`
        INSERT INTO withdrawals (recipient, type, note, project_name, location, station_id, station_area_id, return_due_date, contract_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [recipient, type, note, project_name || null, officialLocation, station_id || null, station_area_id || null, return_due_date || null, contract_id || null], function(err) {
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

                // Check if stock is now below min_stock
                db.get('SELECT name, quantity, min_stock FROM inventory WHERE id = ?', [item.inventory_id], (checkErr, invCheck) => {
                  if (!checkErr && invCheck && invCheck.quantity < invCheck.min_stock) {
                    const stockAlertMsg = `\n⚠️ *อุปกรณ์ต่ำกว่าเกณฑ์ขั้นต่ำ!*\nพัสดุ: ${invCheck.name}\nคงเหลือ: ${invCheck.quantity} ชิ้น (เกณฑ์ขั้นต่ำ: ${invCheck.min_stock} ชิ้น)`;
                    sendLineNotify('stock', stockAlertMsg);
                  }
                });

                const providedSns = (item.serial_numbers || []).filter(sn => sn.trim() !== '');

                if (providedSns.length > 0) {
                  let snsDone = 0;
                  providedSns.forEach(sn => {
                    if (errorOccurred) return;
                    
                    db.get('SELECT id, inventory_id FROM inventory_instances WHERE serial_number = ?', [sn], (err, row) => {
                      if (err) {
                        errorOccurred = true;
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                      }
                      
                      if (row && row.inventory_id !== item.inventory_id) {
                        errorOccurred = true;
                        db.run('ROLLBACK');
                        return res.status(400).json({ message: `หมายเลขเครื่อง S/N '${sn}' ถูกใช้งานไปแล้วกับอุปกรณ์ประเภทอื่น` });
                      }
                      
                      const proceedWithTx = (instanceId) => {
                        logTransaction({
                          inventory_id: item.inventory_id,
                          instance_id: instanceId,
                          transaction_type: 'WITHDRAW',
                          quantity_withdrawn: 1,
                          project_name: project_name,
                          location: officialLocation,
                          station_id: station_id,
                          contract_id: contract_id,
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
                              location: officialLocation,
                              station_id: station_id,
                              contract_id: contract_id,
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
                        db.run(`UPDATE inventory_instances SET status = 'Withdrawn', current_location = ?, station_id = ?, contract_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                          [officialLocation || project_name || 'Withdrawn', station_id || null, contract_id || null, instanceId], (err) => {
                            if (err) {
                              errorOccurred = true;
                              db.run('ROLLBACK');
                              return res.status(500).json({ error: err.message });
                            }
                            proceedWithTx(instanceId);
                          });
                      } else {
                        db.run(`INSERT INTO inventory_instances (inventory_id, serial_number, status, current_location, station_id, contract_id) VALUES (?, ?, 'Withdrawn', ?, ?, ?)`,
                          [item.inventory_id, sn, officialLocation || project_name || 'Withdrawn', station_id || null, contract_id || null], function(err) {
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
                    location: officialLocation,
                    station_id: station_id,
                    contract_id: contract_id,
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
                    // Notify LINE that a withdrawal was made (once per withdrawal)
                    notifyWithdrawal(withdrawalId);
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
  } catch (err) {
    console.error('Create Withdrawal Error:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
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
    db.get('SELECT wi.*, w.recipient, w.project_name, w.location, w.station_id, w.contract_id, w.note FROM withdrawal_items wi JOIN withdrawals w ON wi.withdrawal_id = w.id WHERE wi.id = ? AND wi.withdrawal_id = ?', [itemId, id], (err, item) => {
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
          db.get('SELECT id, inventory_id FROM inventory_instances WHERE serial_number = ?', [sn], (err, row) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }

            if (row && row.inventory_id !== item.inventory_id) {
              db.run('ROLLBACK');
              return res.status(400).json({ message: `หมายเลขเครื่อง S/N '${sn}' ถูกใช้งานไปแล้วกับอุปกรณ์ประเภทอื่น` });
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
                station_id: item.station_id,
                contract_id: item.contract_id,
                user_name: item.recipient,
                note: `ระบุ S/N ย้อนหลังสำหรับการเบิก #${id}`,
                withdrawal_id: id
              });

              processed++;
              if (processed === newSns.length) {
                db.run('COMMIT');
                logAudit('withdrawal', id, 'withdrawal update', item, { ...item, serial_numbers: updatedSnsStr }, item.recipient || 'System/Admin').catch(e => console.error(e));
                res.json({ message: 'ระบุ Serial Numbers ย้อนหลังเรียบร้อยแล้ว' });
              }
            };

            if (row) {
              db.run(`UPDATE inventory_instances SET status = 'Withdrawn', current_location = ?, station_id = ?, contract_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [item.location || item.project_name || 'Withdrawn', item.station_id || null, item.contract_id || null, row.id], (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                  }
                  finalizeSn(row.id);
                });
            } else {
              db.run(`INSERT INTO inventory_instances (inventory_id, serial_number, status, current_location, station_id, contract_id) VALUES (?, ?, 'Withdrawn', ?, ?, ?)`,
                [item.inventory_id, sn, item.location || item.project_name || 'Withdrawn', item.station_id || null, item.contract_id || null], function(err) {
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
  
  db.get(`
    SELECT *
    FROM withdrawals_view
    WHERE id = ?
  `, [id], (err, withdrawal) => {
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
          db.run('DELETE FROM inventory_transactions WHERE withdrawal_id = ?', [id], function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }
            db.run('COMMIT');
            return res.json({ message: 'ลบประวัติการเบิกเรียบร้อย' });
          });
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
                db.run('DELETE FROM inventory_transactions WHERE withdrawal_id = ?', [id], function(err) {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                  }
                  db.run('COMMIT');
                  res.json({ message: 'ยกเลิกการเบิกและคืนสต็อกเรียบร้อย' });
                });
              });
            }
          });
      });
    });
  });
};

exports.updateWithdrawalCompany = (req, res) => {
  const { id } = req.params;
  const { company_id } = req.body;
  db.run(
    'UPDATE withdrawals SET company_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [company_id || null, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'อัปเดตข้อมูลบริษัทของใบเบิกสำเร็จ' });
    }
  );
};
