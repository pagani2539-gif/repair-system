module.exports = {
  name: '024_create_company_info',
  up: (db, callback) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS company_info (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name_th TEXT,
          name_en TEXT,
          address TEXT,
          phone TEXT,
          email TEXT,
          tax_id TEXT,
          website TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return callback(err);

        db.get('SELECT COUNT(*) as cnt FROM company_info', [], (err2, row) => {
          if (err2) return callback(err2);
          if (row && row.cnt > 0) return callback(null);

          db.run(`
            INSERT INTO company_info (id, name_th, name_en, address, phone, email, tax_id, website)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?)
          `, [
            'บริษัท [ชื่อบริษัทของคุณ] จำกัด',
            'Your Company Co., Ltd.',
            '[ที่อยู่บริษัท]',
            '[เบอร์โทรศัพท์]',
            '[อีเมล]',
            '[เลขประจำตัวผู้เสียภาษี]',
            ''
          ], (err3) => {
            if (err3) return callback(err3);
            callback(null);
          });
        });
      });
    });
  }
};
