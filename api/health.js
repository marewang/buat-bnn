// api/health.js
const { getPool } = require('./_utils/db');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  // Cek env dulu supaya error-nya jelas
  const hasEnv = !!process.env.DATABASE_URL;
  if (!hasEnv) {
    res.statusCode = 500;
    res.end(JSON.stringify({
      ok: false,
      error: 'DATABASE_URL is missing in environment'
    }));
    return;
  }

  try {
    const pool = getPool();
    // Test simple query
    const { rows } = await pool.query('SELECT NOW() as now');
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, now: rows[0].now }));
  } catch (e) {
    console.error('HEALTH ERROR:', e);
    res.statusCode = 500;
    res.end(JSON.stringify({
      ok: false,
      message: e.message || String(e),
      code: e.code || null
    }));
  }
};
