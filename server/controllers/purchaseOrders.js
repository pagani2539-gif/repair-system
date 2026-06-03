const db = require('../database/init');
const { checkAndGenerateAutoPOs } = require('../utils/autoPo');

exports.getAllPOs = (req, res) => {
  const { status, search } = req.query;
  let query = `
    SELECT po.*, 
      (SELECT COUNT(*) FROM purchase_order_items WHERE po_id = po.id) as item_count,
      (SELECT SUM(quantity * unit_price) FROM purchase_order_items WHERE po_id = po.id) as total_price
    FROM purchase_orders po
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND po.status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (po.po_no LIKE ? OR po.note LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam);
  }

  query += ' ORDER BY po.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.getPOById = (req, res) => {
  const { id } = req.params;
  const poQuery = `
    SELECT po.*,
      (SELECT SUM(quantity * unit_price) FROM purchase_order_items WHERE po_id = po.id) as total_price
    FROM purchase_orders po
    WHERE po.id = ?
  `;
  db.get(poQuery, [id], (err, po) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!po) return res.status(404).json({ message: 'ไม่พบข้อมูลใบสั่งซื้อ' });

    const itemsQuery = `
      SELECT poi.*, i.name as item_name, i.model as item_model, i.quantity as current_stock, i.min_stock
      FROM purchase_order_items poi
      JOIN inventory i ON poi.inventory_id = i.id
      WHERE poi.po_id = ?
    `;

    db.all(itemsQuery, [id], (err, items) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ...po, items });
    });
  });
};

exports.createPO = (req, res) => {
  const { po_no, note, items, ordered_by, project_name } = req.body; // items is array of { inventory_id, quantity, unit_price }

  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'กรุณาเลือกรายการอุปกรณ์อย่างน้อย 1 รายการ' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const poNo = po_no || `PO-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

    db.run(`
      INSERT INTO purchase_orders (po_no, status, created_by, note, ordered_by, project_name)
      VALUES (?, 'Draft', 'User', ?, ?, ?)
    `, [poNo, note || null, ordered_by || null, project_name || null], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: err.message });
      }

      const poId = this.lastID;
      let inserted = 0;
      let errorOccurred = false;

      items.forEach(item => {
        if (errorOccurred) return;

        db.run(`
          INSERT INTO purchase_order_items (po_id, inventory_id, quantity, unit_price)
          VALUES (?, ?, ?, ?)
        `, [poId, item.inventory_id, item.quantity, item.unit_price || 0], (err) => {
          if (err) {
            errorOccurred = true;
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }

          inserted++;
          if (inserted === items.length) {
            db.run('COMMIT');
            res.status(201).json({ id: poId, po_no: poNo, message: 'สร้างใบสั่งซื้อสำเร็จ' });
          }
        });
      });
    });
  });
};

exports.updatePO = (req, res) => {
  const { id } = req.params;
  const { status, note, items, ordered_by, project_name } = req.body;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.get('SELECT * FROM purchase_orders WHERE id = ?', [id], (err, po) => {
      if (err || !po) {
        db.run('ROLLBACK');
        return res.status(404).json({ message: 'ไม่พบใบสั่งซื้อ' });
      }

      if (po.status === 'Received') {
        db.run('ROLLBACK');
        return res.status(400).json({ message: 'ไม่สามารถแก้ไขใบสั่งซื้อที่รับของแล้วได้' });
      }

      let updateQuery = 'UPDATE purchase_orders SET note = ?, ordered_by = ?, project_name = ?, updated_at = CURRENT_TIMESTAMP';
      const params = [
        note !== undefined ? note : po.note,
        ordered_by !== undefined ? ordered_by : po.ordered_by,
        project_name !== undefined ? project_name : po.project_name
      ];

      if (status) {
        updateQuery += ', status = ?';
        params.push(status);
      }

      updateQuery += ' WHERE id = ?';
      params.push(id);

      db.run(updateQuery, params, (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }

        if (items && Array.isArray(items)) {
          db.run('DELETE FROM purchase_order_items WHERE po_id = ?', [id], (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }

            if (items.length === 0) {
              db.run('COMMIT');
              return res.json({ message: 'อัปเดตใบสั่งซื้อเรียบร้อย (ไม่มีรายการ)' });
            }

            let inserted = 0;
            let errorOccurred = false;

            items.forEach(item => {
              if (errorOccurred) return;

              db.run(`
                INSERT INTO purchase_order_items (po_id, inventory_id, quantity, unit_price, received_quantity)
                VALUES (?, ?, ?, ?, ?)
              `, [id, item.inventory_id, item.quantity, item.unit_price || 0, item.received_quantity || 0], (err) => {
                if (err) {
                  errorOccurred = true;
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: err.message });
                }

                inserted++;
                if (inserted === items.length) {
                  db.run('COMMIT');
                  res.json({ message: 'อัปเดตใบสั่งซื้อเรียบร้อย' });
                }
              });
            });
          });
        } else {
          db.run('COMMIT');
          res.json({ message: 'อัปเดตข้อมูลใบสั่งซื้อเรียบร้อย' });
        }
      });
    });
  });
};

exports.deletePO = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM purchase_orders WHERE id = ?', [id], (err, po) => {
    if (err || !po) return res.status(404).json({ message: 'ไม่พบข้อมูลใบสั่งซื้อ' });

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      if (po.status === 'Received') {
        db.all('SELECT * FROM purchase_order_items WHERE po_id = ?', [id], (err, poItems) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }

          let revertedItems = 0;
          let errorOccurred = false;

          if (!poItems || poItems.length === 0) {
            performDeletion();
            return;
          }

          poItems.forEach(poItem => {
            if (errorOccurred) return;

            const qtyToRevert = poItem.received_quantity || 0;
            if (qtyToRevert <= 0) {
              revertedItems++;
              if (revertedItems === poItems.length) {
                performDeletion();
              }
              return;
            }

            db.run(
              'UPDATE inventory SET quantity = MAX(0, quantity - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [qtyToRevert, poItem.inventory_id],
              (err) => {
                if (err) {
                  errorOccurred = true;
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: err.message });
                }

                db.run(
                  'DELETE FROM inventory_transactions WHERE inventory_id = ? AND transaction_type = "ADD_STOCK" AND quantity_added = ? AND note LIKE ?',
                  [poItem.inventory_id, qtyToRevert, `%#${po.po_no}%`],
                  (err) => {
                    if (err) {
                      errorOccurred = true;
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: err.message });
                    }

                    revertedItems++;
                    if (revertedItems === poItems.length) {
                      performDeletion();
                    }
                  }
                );
              }
            );
          });
        });
      } else {
        performDeletion();
      }

      function performDeletion() {
        db.run('DELETE FROM purchase_order_items WHERE po_id = ?', [id], (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }

          db.run('DELETE FROM purchase_orders WHERE id = ?', [id], (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }

            db.run('COMMIT');
            res.json({ message: 'ลบใบสั่งซื้อและปรับคืนยอดคลังเรียบร้อยแล้ว' });
          });
        });
      }
    });
  });
};

exports.receivePO = (req, res) => {
  const { id } = req.params;
  const { items } = req.body;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.get('SELECT * FROM purchase_orders WHERE id = ?', [id], (err, po) => {
      if (err || !po) {
        db.run('ROLLBACK');
        return res.status(404).json({ message: 'ไม่พบข้อมูลใบสั่งซื้อ' });
      }

      if (po.status === 'Received') {
        db.run('ROLLBACK');
        return res.status(400).json({ message: 'ใบสั่งซื้อนี้เคยรับสินค้าเข้าระบบไปแล้ว' });
      }

      db.all('SELECT * FROM purchase_order_items WHERE po_id = ?', [id], (err, poItems) => {
        if (err || !poItems || poItems.length === 0) {
          db.run('ROLLBACK');
          return res.status(400).json({ message: 'ไม่พบรายการสินค้าในใบสั่งซื้อ' });
        }

        const receivedQuantities = {};
        if (items && Array.isArray(items)) {
          items.forEach(item => {
            receivedQuantities[item.inventory_id] = parseInt(item.received_quantity) || 0;
          });
        }

        let updatedItems = 0;
        let errorOccurred = false;

        poItems.forEach(poItem => {
          if (errorOccurred) return;

          const receivedQty = receivedQuantities[poItem.inventory_id] !== undefined 
            ? receivedQuantities[poItem.inventory_id] 
            : poItem.quantity;

          if (receivedQty <= 0) {
            updatedItems++;
            if (updatedItems === poItems.length) {
              finalizeReceive();
            }
            return;
          }

          db.run('UPDATE purchase_order_items SET received_quantity = ? WHERE id = ?', [receivedQty, poItem.id], (err) => {
            if (err) {
              errorOccurred = true;
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }

            db.run('UPDATE inventory SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [receivedQty, poItem.inventory_id], (err) => {
              if (err) {
                errorOccurred = true;
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }

              db.run(`
                INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity_added, note)
                VALUES (?, "ADD_STOCK", ?, ?)
              `, [poItem.inventory_id, receivedQty, `รับสินค้าตามใบสั่งซื้อ #${po.po_no}`], (err) => {
                if (err) {
                  errorOccurred = true;
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: err.message });
                }

                updatedItems++;
                if (updatedItems === poItems.length) {
                  finalizeReceive();
                }
              });
            });
          });
        });

        function finalizeReceive() {
          db.run("UPDATE purchase_orders SET status = 'Received', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id], (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }

            db.run('COMMIT');
            res.json({ message: 'รับสินค้าเข้าระบบและอัปเดตสต็อกเรียบร้อยแล้ว' });
          });
        }
      });
    });
  });
};

exports.triggerAutoPO = (req, res) => {
  checkAndGenerateAutoPOs((err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'ระบบสแกนสต็อกและอัปเดตใบสั่งซื้ออัตโนมัติเรียบร้อย' });
  });
};
