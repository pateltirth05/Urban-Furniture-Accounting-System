const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  //connectionString: process.env.DATABASE_URL,
//  Alternatively, discrete fields:
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

pool.on("error", (err) => {
  // Unexpected errors on idle clients — log and let the process manager restart.
  console.error("Unexpected PostgreSQL error on idle client", err);
  process.exit(1);
});

/**
 * Run a single query against the pool.
 */
function query(text, params) {
  return pool.query(text, params);
}

/**
 * Run a callback inside a transaction. Automatically BEGIN/COMMIT/ROLLBACK.
 * Use this for any multi-table financial operation (README #11).
 *
 * Usage:
 *   await withTransaction(async (client) => {
 *     await client.query('...');
 *     await client.query('...');
 *   });
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
