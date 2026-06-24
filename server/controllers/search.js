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
        SELECT r.id, r.ticket_no, r.device_name, r.reporter, r.status, r.received_at, r.location, r.station_id, s.name as station_name
        FROM repairs r
        LEFT JOIN stations s ON r.station_id = s.id
        WHERE r.type = 'repair' AND (
          r.ticket_no LIKE ? OR 
          r.device_name LIKE ? OR 
          r.reporter LIKE ? OR 
          r.problem LIKE ? OR 
          r.location LIKE ? OR
          s.name LIKE ?
        )
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT 8
      `, [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern]),

      // 3. Search Claim Tickets
      queryAll(`
        SELECT r.id, r.ticket_no, r.device_name, r.reporter, r.status, r.received_at, r.location, r.station_id, s.name as station_name
        FROM repairs r
        LEFT JOIN stations s ON r.station_id = s.id
        WHERE r.type = 'claim' AND (
          r.ticket_no LIKE ? OR 
          r.device_name LIKE ? OR 
          r.reporter LIKE ? OR 
          r.problem LIKE ? OR 
          r.location LIKE ? OR
          s.name LIKE ?
        )
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT 8
      `, [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern])
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
