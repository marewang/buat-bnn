// api/_utils/db.js
// Connection pool for PostgreSQL using 'pg'
const { Pool } = require('pg');

let _pool;

function getPool() {
  if (_pool) return _pool;
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  return _pool;
}

module.exports = { getPool };