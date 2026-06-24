module.exports = {
  name: '035_add_inventory_link_to_repairs_view',
  up: (db, callback) => {
    db.serialize(() => {
      db.run(`DROP VIEW IF EXISTS repairs_view`, (err) => {
        if (err) return callback(err);

        db.run(`
          CREATE VIEW repairs_view AS
          SELECT r.id, r.ticket_no, r.reporter, r.device_name, r.problem, r.priority, r.status,
                 r.technician, r.repair_note, r.is_read, r.type, r.received_at, r.created_at, r.updated_at,
                 r.project_name, r.station_id, r.station_area_id, r.instance_id, r.inventory_id,
                 r.location as location_snapshot,
                 COALESCE(s.name, r.location) as location,
                 s.name as station_name,
                 s.code as station_code,
                 s.status as station_status,
                 s.province as station_province,
                 s.region as station_region,
                 sa.name as station_area_name
          FROM repairs r
          LEFT JOIN stations s ON r.station_id = s.id
          LEFT JOIN station_areas sa ON r.station_area_id = sa.id
        `, callback);
      });
    });
  }
};
