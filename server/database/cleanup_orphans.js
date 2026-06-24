const db = require('./init');

console.log('--- Database Cleanup Started ---');

db.serialize(() => {
  // 1. Cleanup orphaned withdrawal items
  db.run(`
    DELETE FROM withdrawal_items 
    WHERE withdrawal_id NOT IN (SELECT id FROM withdrawals)
  `, function(err) {
    if (err) {
      console.error('Error cleaning up withdrawal_items:', err.message);
    } else {
      console.log(`Cleaned up ${this.changes} orphaned withdrawal items.`);
    }
  });

  // 2. Cleanup orphaned repair logs
  db.run(`
    DELETE FROM repair_logs 
    WHERE repair_id NOT IN (SELECT id FROM repairs)
  `, function(err) {
    if (err) {
      console.error('Error cleaning up repair_logs:', err.message);
    } else {
      console.log(`Cleaned up ${this.changes} orphaned repair logs.`);
    }
  });

  // 3. Cleanup orphaned inventory instances (S/Ns)
  // These might be orphaned if inventory_id is deleted, though usually we don't delete inventory items that have history.
  // But for safety, checking instances too.
  db.run(`
    DELETE FROM inventory_instances 
    WHERE inventory_id NOT IN (SELECT id FROM inventory)
  `, function(err) {
    if (err) {
      console.error('Error cleaning up inventory_instances:', err.message);
    } else {
      console.log(`Cleaned up ${this.changes} orphaned inventory instances.`);
    }
  });

  // 4. Cleanup orphaned inventory transactions
  db.run(`
    DELETE FROM inventory_transactions 
    WHERE withdrawal_id IS NOT NULL 
      AND withdrawal_id NOT IN (SELECT id FROM withdrawals)
  `, function(err) {
    if (err) {
      console.error('Error cleaning up inventory_transactions:', err.message);
    } else {
      console.log(`Cleaned up ${this.changes} orphaned inventory transactions.`);
    }
  });

  console.log('--- Database Cleanup Finished ---');
});
