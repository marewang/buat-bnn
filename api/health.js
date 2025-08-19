// api/health.js
import { getPool } from './_utils/db.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (!process.env.DATABASE_URL) {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: 'DATABASE_URL is missing in environment' }));
    return;
  }

  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT NOW() AS now');
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
}
