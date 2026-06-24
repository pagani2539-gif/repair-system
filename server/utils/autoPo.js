const db = require('../database/init');
const { generateDocNo } = require('./docNumber');

function checkAndGenerateAutoPOs(callback) {
  // 1. Get all low stock items
  db.all('SELECT id, min_stock, quantity FROM inventory WHERE quantity < min_stock', [], (err, lowStockItems) => {
    if (err) {
      console.error('Error fetching low stock items:', err.message);
      if (callback) callback(err);
      return;
    }

    if (!lowStockItems || lowStockItems.length === 0) {
      if (callback) callback(null);
      return;
    }

    // 2. Find if there is an active 'Draft' PO (we can use an auto-generated draft PO or any Draft PO)
    db.get("SELECT id FROM purchase_orders WHERE status = 'Draft' ORDER BY created_at DESC LIMIT 1", [], (err, draftPo) => {
      if (err) {
        console.error('Error finding draft PO:', err.message);
        if (callback) callback(err);
        return;
      }

      const processItems = (poId) => {
        let completed = 0;
        let errorOccurred = false;

        lowStockItems.forEach(item => {
          if (errorOccurred) return;

          const deficit = item.min_stock - item.quantity;

          // Check if item is already in purchase_order_items for this poId
          db.get('SELECT id, quantity FROM purchase_order_items WHERE po_id = ? AND inventory_id = ?', [poId, item.id], (err, poItem) => {
            if (err) {
              errorOccurred = true;
              if (callback) callback(err);
              return;
            }

            if (poItem) {
              // Update quantity to deficit if different
              if (poItem.quantity !== deficit) {
                db.run('UPDATE purchase_order_items SET quantity = ? WHERE id = ?', [deficit, poItem.id], (err) => {
                  if (err) {
                    errorOccurred = true;
                    if (callback) callback(err);
                    return;
                  }
                  completed++;
                  if (completed === lowStockItems.length && callback) callback(null);
                });
              } else {
                completed++;
                if (completed === lowStockItems.length && callback) callback(null);
              }
            } else {
              // Insert new item
              db.run('INSERT INTO purchase_order_items (po_id, inventory_id, quantity, unit_price) VALUES (?, ?, ?, 0)',
                [poId, item.id, deficit], (err) => {
                  if (err) {
                    errorOccurred = true;
                    if (callback) callback(err);
                    return;
                  }
                  completed++;
                  if (completed === lowStockItems.length && callback) callback(null);
                });
            }
          });
        });
      };

      if (draftPo) {
        // Use existing Draft PO
        processItems(draftPo.id);
      } else {
        // Create new Draft PO — same "PO-YYMMDD-NNN" format as manual POs
        // (the "auto" origin is shown via the note/badge, not a separate prefix)
        const note = 'สั่งซื้ออัตโนมัติเนื่องจากสินค้าต่ำกว่าเกณฑ์ขั้นต่ำ';

        generateDocNo('PO', { table: 'purchase_orders', column: 'po_no' }).then((poNo) => {
          db.run('INSERT INTO purchase_orders (po_no, status, created_by, note) VALUES (?, "Draft", "System", ?)',
            [poNo, note], function(err) {
              if (err) {
                console.error('Error creating auto PO:', err.message);
                if (callback) callback(err);
                return;
              }
              processItems(this.lastID);
            });
        }).catch((err) => {
          console.error('Error generating auto PO number:', err.message);
          if (callback) callback(err);
        });
      }
    });
  });
}

module.exports = {
  checkAndGenerateAutoPOs
};
