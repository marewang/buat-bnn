// api/health.js
const { getPool } = require('./_utils/db');

module.exports = async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT NOW() as now');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, now: rows[0].now }));
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: 'DB connection failed' }));
  }
};