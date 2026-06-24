module.exports = {
  name: '020_update_transactions_view',
  up: (db, callback) => {
    db.serialize(() => {
      db.run(`DROP VIEW IF EXISTS transactions_view`, (err) => {
        if (err) return callback(err);

        db.run(`
          CREATE VIEW transactions_view AS
          SELECT t.id, t.inventory_id, t.instance_id, t.transaction_type, t.quantity_added, t.quantity_withdrawn,
                 t.quantity_borrowed, t.quantity_returned, t.project_name, t.station_id, t.user_name, t.note,
                 t.withdrawal_id, t.return_image, t.created_at,
                 t.location as location_snapshot,
                 COALESCE(s.name, t.location) as location,
                 s.name as station_name,
                 s.code as station_code,
                 s.status as station_status,
                 s.province as station_province,
                 i.name as product_name,
                 i.model as product_model,
                 inst.serial_number,
                 inst.condition,
                 w.type as withdrawal_type,
                 w.station_area_id,
                 sa.name as station_area_name
          FROM inventory_transactions t
          JOIN inventory i ON t.inventory_id = i.id
          LEFT JOIN inventory_instances inst ON t.instance_id = inst.id
          LEFT JOIN withdrawals w ON t.withdrawal_id = w.id
          LEFT JOIN stations s ON t.station_id = s.id
          LEFT JOIN station_areas sa ON w.station_area_id = sa.id
        `, callback);
      });
    });
  }
};
