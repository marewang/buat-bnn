// api/_utils/db.js
import { Pool } from 'pg';

let pool;

export function getPool() {
  if (pool) return pool;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('ENV DATABASE_URL is missing');
  }

  pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }, // wajib untuk Neon
    max: 5,
    idleTimeoutMillis: 0,
  });

  return pool;
}
