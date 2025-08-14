// api/asn.js
const { getPool } = require('./_utils/db');
const parseBody = require('./_utils/parseBody');

module.exports = async (req, res) => {
  const pool = getPool();
  res.setHeader('Content-Type', 'application/json');

  try {
    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM asns ORDER BY id DESC');
      res.statusCode = 200;
      res.end(JSON.stringify(rows));
      return;
    }

    if (req.method === 'POST') {
      const b = await parseBody(req);
      const q = `
        INSERT INTO asns (nama, nip, tmt_pns, riwayat_tmt_kgb, riwayat_tmt_pangkat, jadwal_kgb_berikutnya, jadwal_pangkat_berikutnya)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *`;
      const params = [b.nama, b.nip, b.tmt_pns, b.riwayat_tmt_kgb, b.riwayat_tmt_pangkat, b.jadwal_kgb_berikutnya, b.jadwal_pangkat_berikutnya];
      const { rows } = await pool.query(q, params);
      res.statusCode = 201;
      res.end(JSON.stringify(rows[0]));
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Server error' }));
  }
};