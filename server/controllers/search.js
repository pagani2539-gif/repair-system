const db = require('../database/init');

// SQLite Query Helpers for Async/Await
const queryAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.json({
        inventory: [],
        repairs: [],
        claims: []
      });
    }

    const searchPattern = `%${q}%`;

    const [inventory, repairs, claims] = await Promise.all([
      // 1. Search Inventory Items
      queryAll(`
        SELECT id, name, model, quantity, min_stock, image_path 
        FROM inventory 
        WHERE name LIKE ? OR model LIKE ? OR description LIKE ? 
        LIMIT 8
      `, [searchPattern, searchPattern, searchPattern]),

      // 2. Search Repair Tickets
      queryAll(`
        SELECT id, ticket_no, device_name, reporter, status, received_at, location
        FROM repairs 
        WHERE type = 'repair' AND (
          ticket_no LIKE ? OR 
          device_name LIKE ? OR 
          reporter LIKE ? OR 
          problem LIKE ? OR 
          location LIKE ?
        )
        ORDER BY created_at DESC
        LIMIT 8
      `, [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern]),

      // 3. Search Claim Tickets
      queryAll(`
        SELECT id, ticket_no, device_name, reporter, status, received_at, location
        FROM repairs 
        WHERE type = 'claim' AND (
          ticket_no LIKE ? OR 
          device_name LIKE ? OR 
          reporter LIKE ? OR 
          problem LIKE ? OR 
          location LIKE ?
        )
        ORDER BY created_at DESC
        LIMIT 8
      `, [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern])
    ]);

    res.json({
      inventory,
      repairs,
      claims
    });
  } catch (err) {
    console.error('Global Search Error:', err);
    res.status(500).json({ error: err.message });
  }
};
