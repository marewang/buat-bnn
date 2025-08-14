// api/notif.js
const { getPool } = require('./_utils/db');

module.exports = async (req, res) => {
  const pool = getPool();
  res.setHeader('Content-Type', 'application/json');
  try {
    const { rows } = await pool.query('SELECT * FROM v_asn_notif ORDER BY jadwal_kgb_berikutnya NULLS LAST, jadwal_pangkat_berikutnya NULLS LAST LIMIT 200');
    res.statusCode = 200;
    res.end(JSON.stringify(rows));
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Server error' }));
  }
};