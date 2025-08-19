// api/_utils/db.js
import { Pool } from 'pg';

let _pool;
export function getPool() {
  if (_pool) return _pool;
  const conn = process.env.DATABASE_URL;
  if (!conn) throw new Error('Missing env DATABASE_URL');
  _pool = new Pool({
    connectionString: conn,
    ssl: { rejectUnauthorized: false } // Neon pakai SSL
  });
  return _pool;
}
