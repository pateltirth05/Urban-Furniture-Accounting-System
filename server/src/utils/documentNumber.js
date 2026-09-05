/**
 * Backend-authoritative document number generation.
 *
 * Golden rule (README #6, #46): users never type document numbers or
 * primary IDs. Every PO/SO/Bill/Invoice/Payment/Journal Entry number is
 * generated here, inside the same transaction that creates the row, so
 * numbering stays gapless-per-prefix and race-safe under concurrent
 * requests (SELECT ... FOR UPDATE on a counters table avoids relying on
 * COUNT(*), which is not safe against concurrent inserts).
 *
 * Usage (inside a controller, using the transaction's client):
 *   const poNumber = await nextDocumentNumber(client, 'PO');
 *   // -> 'PO00001', 'PO00002', ...
 */

const PREFIX_LENGTH = 5; // PO00001 -> 5 digits after the prefix

/**
 * Ensure a `document_counters` table exists. Call once from your
 * migration/schema step, or lazily on first use (kept here for clarity;
 * in production add this CREATE TABLE to schema.sql instead).
 *
 * document_counters(prefix TEXT PRIMARY KEY, last_value BIGINT NOT NULL)
 */
async function ensureCounterTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS document_counters (
      prefix TEXT PRIMARY KEY,
      last_value BIGINT NOT NULL DEFAULT 0
    )
  `);
}

/**
 * Atomically get the next number for a prefix (e.g. 'PO', 'SO', 'B',
 * 'INV', 'PMT', 'JE') within an existing transaction.
 *
 * @param {import('pg').PoolClient} client - a client already inside BEGIN
 * @param {string} prefix
 * @returns {Promise<string>} e.g. "PO00001"
 */
async function nextDocumentNumber(client, prefix) {
  await ensureCounterTable(client);

  const { rows } = await client.query(
    `INSERT INTO document_counters (prefix, last_value)
     VALUES ($1, 1)
     ON CONFLICT (prefix)
     DO UPDATE SET last_value = document_counters.last_value + 1
     RETURNING last_value`,
    [prefix]
  );

  const next = rows[0].last_value;
  return `${prefix}${String(next).padStart(PREFIX_LENGTH, "0")}`;
}

module.exports = { nextDocumentNumber };
