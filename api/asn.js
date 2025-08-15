// api/asn.js
const { getPool } = require('./_utils/db');

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
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};

      const q = `
        INSERT INTO asns
          (nama, nip, tmt_pns, riwayat_tmt_kgb, riwayat_tmt_pangkat, jadwal_kgb_berikutnya, jadwal_pangkat_berikutnya)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *;
      `;
      const vals = [
        body.nama ?? null,
        body.nip ?? null,
        body.tmt_pns ?? null,
        body.riwayat_tmt_kgb ?? null,
        body.riwayat_tmt_pangkat ?? null,
        body.jadwal_kgb_berikutnya ?? null,
        body.jadwal_pangkat_berikutnya ?? null,
      ];
      const { rows } = await pool.query(q, vals);
      res.statusCode = 200;
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
