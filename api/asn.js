// api/asn.js (ESM)
import { getPool } from './_utils/db.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

  res.setHeader('Content-Type', 'application/json');
  const pool = getPool();

  try {
    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM asns ORDER BY id DESC');
      res.statusCode = 200;
      res.end(JSON.stringify(rows));
      return;
    }

    if (req.method === 'POST') {
      const body = await readJSON(req);
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
    console.error('ASN LIST/CREATE ERROR:', e);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message || 'Server error' }));
  }
}
