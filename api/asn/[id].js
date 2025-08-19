// api/asn/[id].js
import { getPool } from '../_utils/db.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function getId(req) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const parts = url.pathname.split('/').filter(Boolean); // ["api","asn","123"]
  const last = parts.pop() || '';
  return /^\d+$/.test(last) ? last : null; // pakai string numeric (aman utk BIGINT)
}
async function readJSON(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  const pool = getPool();
  res.setHeader('Content-Type', 'application/json');

  try {
    const id = getId(req);
    if (!id) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Invalid id' })); return; }

    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM asns WHERE id = $1::bigint', [id]);
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
        WHERE id=$8::bigint
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
      res.statusCode = rows[0] ? 200 : 404;
      res.end(JSON.stringify(rows[0] || null));
      return;
    }

    if (req.method === 'DELETE') {
      const { rowCount } = await pool.query('DELETE FROM asns WHERE id=$1::bigint RETURNING id', [id]);
      if (!rowCount) { res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found' })); return; }
      res.statusCode = 200; // balas JSON (lebih aman lintas proxy)
      res.end(JSON.stringify({ deleted: true, id }));
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  } catch (e) {
    console.error('ASN [id] ERROR:', e);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message || 'Server error' }));
  }
}
