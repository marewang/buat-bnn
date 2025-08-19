// api/asn/[id].js
import { getPool } from '../_utils/db.js';

async function readJSON(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export default async function handler(req, res) {
  const pool = getPool();
  res.setHeader('Content-Type', 'application/json');

  try {
    const id = req.url.split('/').pop();

    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM asns WHERE id=$1', [id]);
      res.statusCode = rows[0] ? 200 : 404;
      res.end(JSON.stringify(rows[0] || null));
      return;
    }

    if (req.method === 'PUT') {
      const body = await readJSON(req);
      const q = `
        UPDATE asns SET
          nama=$1, nip=$2, tmt_pns=$3, riwayat_tmt_kgb=$4, riwayat_tmt_pangkat=$5,
          jadwal_kgb_berikutnya=$6, jadwal_pangkat_berikutnya=$7, updated_at=NOW()
        WHERE id=$8
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
        id,
      ];
      const { rows } = await pool.query(q, vals);
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
    console.error('ASN ID ERROR:', e);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message || 'Server error' }));
  }
}
