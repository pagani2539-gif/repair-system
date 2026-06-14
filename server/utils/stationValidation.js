const db = require('../database/init');

const queryGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

const validateStationExists = async (stationId) => {
  if (!stationId) return;
  const row = await queryGet('SELECT status FROM stations WHERE id = ?', [stationId]);
  if (!row) {
    const err = new Error('ไม่พบสถานีที่เลือกในระบบ');
    err.status = 400;
    throw err;
  }
  if (row.status !== 1) {
    const err = new Error('สถานีที่เลือกถูกปิดใช้งานหรือลบออกแล้ว');
    err.status = 400;
    throw err;
  }
};

const validateStationAreaBelongsToStation = async (stationId, stationAreaId) => {
  if (!stationAreaId) return;
  if (!stationId) {
    const err = new Error('กรุณาระบุสถานีสำหรับพื้นที่ย่อยที่เลือก');
    err.status = 400;
    throw err;
  }
  
  // First ensure station exists and is active
  await validateStationExists(stationId);

  const row = await queryGet('SELECT id, status FROM station_areas WHERE id = ? AND station_id = ?', [stationAreaId, stationId]);
  if (!row) {
    const err = new Error('พื้นที่ย่อยที่เลือกไม่อยู่ในสถานีนี้');
    err.status = 400;
    throw err;
  }
  if (row.status === 0) {
    const err = new Error('พื้นที่ย่อยที่เลือกถูกปิดใช้งานหรือลบออกแล้ว');
    err.status = 400;
    throw err;
  }
};

const getStationSnapshotName = async (stationId) => {
  if (!stationId) return null;
  const row = await queryGet('SELECT name FROM stations WHERE id = ?', [stationId]);
  return row ? row.name : null;
};

module.exports = {
  validateStationExists,
  validateStationAreaBelongsToStation,
  getStationSnapshotName
};
