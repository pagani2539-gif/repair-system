module.exports = {
  name: '021_add_responsible_person_to_stations',
  up: (db, callback) => {
    // เพิ่มคอลัมน์ responsible_person (ชื่อผู้รับผิดชอบสถานี) — nullable เพื่อไม่ break สถานีเก่า
    // การบังคับให้กรอกอยู่ที่ UI + backend validation สำหรับ create/update ใหม่
    db.run("ALTER TABLE stations ADD COLUMN responsible_person TEXT", (err) => {
      if (err && !err.message.includes("duplicate column name")) {
        return callback(err);
      }
      callback(null);
    });
  }
};
