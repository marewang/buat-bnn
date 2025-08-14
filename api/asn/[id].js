// api/asn/[id].js
const { getPool } = require('../_utils/db');
const parseBody = require('../_utils/parseBody');

module.exports = async (req, res) => {
  const pool = getPool();
  res.setHeader('Content-Type', 'application/json');

  // Extract ID from path: /api/asn/<id>
  const match = req.url.match(/\/api\/asn\/(\d+)/);
  const id = match ? parseInt(match[1], 10) : null;
  if (!id) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Invalid id' }));
    return;
  }

  try {
    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM asns WHERE id=$1', [id]);
      if (!rows.length) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }
      res.statusCode = 200;
      res.end(JSON.stringify(rows[0]));
      return;
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const b = await parseBody(req);
      const q = `
        UPDATE asns SET
          nama = COALESCE($1, nama),
          nip = COALESCE($2, nip),
          tmt_pns = COALESCE($3, tmt_pns),
          riwayat_tmt_kgb = COALESCE($4, riwayat_tmt_kgb),
          riwayat_tmt_pangkat = COALESCE($5, riwayat_tmt_pangkat),
          jadwal_kgb_berikutnya = COALESCE($6, jadwal_kgb_berikutnya),
          jadwal_pangkat_berikutnya = COALESCE($7, jadwal_pangkat_berikutnya)
        WHERE id=$8
        RETURNING *`;
      const params = [
        b.nama ?? null, b.nip ?? null, b.tmt_pns ?? null,
        b.riwayat_tmt_kgb ?? null, b.riwayat_tmt_pangkat ?? null,
        b.jadwal_kgb_berikutnya ?? null, b.jadwal_pangkat_berikutnya ?? null,
        id
      ];
      const { rows } = await pool.query(q, params);
      if (!rows.length) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }
      res.statusCode = 200;
      res.end(JSON.stringify(rows[0]));
      return;
    }

    if (req.method === 'DELETE') {
      await pool.query('DELETE FROM asns WHERE id=$1', [id]);
      res.statusCode = 204;
      res.end();
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