// api/asn/[id].js
import { getPool } from '../_utils/db.js';

function getId(req) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const parts = url.pathname.split('/').filter(Boolean); // ["api","asn","123"]
  const last = parts.pop() || '';
  if (!/^\d+$/.test(last)) return null; // hanya angka
  return last; // string "123" (biarkan string, biar aman utk bigint)
}

export default async function handler(req, res) {
  const pool = getPool();
  res.setHeader('Content-Type', 'application/json');

  try {
    const id = getId(req);
    if (!id) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Invalid id' }));
      return;
    }

    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM asns WHERE id = $1::bigint', [id]);
      res.statusCode = rows[0] ? 200 : 404;
      res.end(JSON.stringify(rows[0] || null));
      return;
    }

    if (req.method === 'PUT') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};

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
      // RETURNING agar jelas apakah ada row yang terhapus
      const { rowCount } = await pool.query(
        'DELETE FROM asns WHERE id = $1::bigint RETURNING id',
        [id]
      );
      if (!rowCount) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }
      res.statusCode = 200; // gunakan 200 JSON, lebih aman di berbagai proxy
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
