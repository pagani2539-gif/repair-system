const db = require('../database/init');

/**
 * Bangkok-local date as YYMMDD using a 2-digit Buddhist-era (พ.ศ.) year.
 * e.g. 2026-06-15 (ค.ศ.) → พ.ศ. 2569 → "690615"
 */
function thaiDatePart(d = new Date()) {
  // Shift to UTC+7, then read the UTC fields so the result is Bangkok-local
  const bkk = new Date(d.getTime() + 7 * 3600 * 1000);
  const yy = String((bkk.getUTCFullYear() + 543) % 100).padStart(2, '0');
  const mm = String(bkk.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(bkk.getUTCDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

/**
 * Generates a document number "PREFIX-YYMMDD-NNN" with a running sequence that
 * resets each day. NNN is derived from the highest existing number for that
 * prefix+date, so numbers stay sequential and never collide.
 *
 * @param {string} prefix  e.g. 'RP', 'CL', 'PO', 'WD'
 * @param {{table:string, column:string}} opts  table/column that stores the number
 * @returns {Promise<string>}
 */
function generateDocNo(prefix, { table, column }) {
  return new Promise((resolve, reject) => {
    const datePart = thaiDatePart();
    const like = `${prefix}-${datePart}-%`;

    db.serialize(() => {
      // 1. Try to insert the initial row as 0. If it exists, do nothing (IGNORE).
      db.run(
        `INSERT OR IGNORE INTO sequences (prefix, date_part, seq) VALUES (?, ?, 0)`,
        [prefix, datePart],
        (err) => {
          if (err) {
            // Fallback to older SELECT latest logic if sequences table does not exist
            if (err.message.includes('no such table')) {
              const sql = `SELECT ${column} AS no FROM ${table} WHERE ${column} LIKE ? ORDER BY ${column} DESC LIMIT 1`;
              db.get(sql, [like], (fallbackErr, row) => {
                if (fallbackErr) return reject(fallbackErr);
                let seq = 1;
                if (row && row.no) {
                  const m = String(row.no).match(/-(\d+)$/);
                  if (m) seq = parseInt(m[1], 10) + 1;
                }
                return resolve(`${prefix}-${datePart}-${String(seq).padStart(3, '0')}`);
              });
              return;
            }
            return reject(err);
          }

          // 2. Fetch the current sequence number
          db.get(
            `SELECT seq FROM sequences WHERE prefix = ? AND date_part = ?`,
            [prefix, datePart],
            (err2, row) => {
              if (err2) return reject(err2);

              if (row && row.seq === 0) {
                // If the sequence is 0, it means it was just initialized for a new day.
                // We need to seed it from the target table's maximum existing suffix today.
                const sql = `SELECT ${column} AS no FROM ${table} WHERE ${column} LIKE ? ORDER BY ${column} DESC LIMIT 1`;
                db.get(sql, [like], (err3, rowTarget) => {
                  if (err3) return reject(err3);
                  let currentMax = 0;
                  if (rowTarget && rowTarget.no) {
                    const m = String(rowTarget.no).match(/-(\d+)$/);
                    if (m) currentMax = parseInt(m[1], 10);
                  }

                  // Update it to currentMax + 1
                  const nextSeq = currentMax + 1;
                  db.run(
                    `UPDATE sequences SET seq = ? WHERE prefix = ? AND date_part = ? AND seq = 0`,
                    [nextSeq, prefix, datePart],
                    function(err4) {
                      if (err4) return reject(err4);

                      if (this.changes === 0) {
                        // Another request already seeded the sequence!
                        // So we increment it atomically.
                        db.get(
                          `UPDATE sequences SET seq = seq + 1 WHERE prefix = ? AND date_part = ? RETURNING seq`,
                          [prefix, datePart],
                          (err5, updatedRow) => {
                            if (err5) return reject(err5);
                            const seq = updatedRow ? updatedRow.seq : nextSeq;
                            resolve(`${prefix}-${datePart}-${String(seq).padStart(3, '0')}`);
                          }
                        );
                      } else {
                        // We successfully seeded the sequence.
                        resolve(`${prefix}-${datePart}-${String(nextSeq).padStart(3, '0')}`);
                      }
                    }
                  );
                });
              } else {
                // The sequence is already > 0. We increment it and get the new value atomically using RETURNING!
                db.get(
                  `UPDATE sequences SET seq = seq + 1 WHERE prefix = ? AND date_part = ? RETURNING seq`,
                  [prefix, datePart],
                  (err3, updatedRow) => {
                    if (err3) return reject(err3);
                    const seq = updatedRow ? updatedRow.seq : 1;
                    resolve(`${prefix}-${datePart}-${String(seq).padStart(3, '0')}`);
                  }
                );
              }
            }
          );
        }
      );
    });
  });
}

module.exports = { thaiDatePart, generateDocNo };
