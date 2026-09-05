const { query, withTransaction } = require("../config/db");
const { nextDocumentNumber } = require("../utils/documentNumber");

async function list(req, res) {
  const { page = 1, pageSize = 20, search = "", journal_id, status } = req.query;
  const limit = Math.min(Number(pageSize) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(je.entry_number ILIKE $${params.length} OR je.reference ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }
  if (journal_id) {
    params.push(journal_id);
    conditions.push(`je.journal_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`je.status = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const countResult = await query(
      `SELECT COUNT(*)::int AS total 
       FROM journal_entries je
       LEFT JOIN contacts c ON c.id = je.partner_id
       ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const rowsResult = await query(
      `SELECT je.*, j.name AS journal_name, c.name AS partner_name,
              COALESCE(SUM(jel.debit), 0)::numeric AS total_debit,
              COALESCE(SUM(jel.credit), 0)::numeric AS total_credit
       FROM journal_entries je
       JOIN journals j ON j.id = je.journal_id
       LEFT JOIN contacts c ON c.id = je.partner_id
       LEFT JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
       ${whereClause}
       GROUP BY je.id, j.name, c.name
       ORDER BY je.entry_date DESC, je.id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({
      data: rowsResult.rows,
      pagination: {
        page: Number(page),
        pageSize: limit,
        total: countResult.rows[0].total,
      },
    });
  } catch (err) {
    console.error("journalEntries.list error", err);
    return res.status(500).json({ message: "Failed to list journal entries" });
  }
}

async function getById(req, res) {
  try {
    const entryResult = await query(
      `SELECT je.*, j.name AS journal_name, c.name AS partner_name
       FROM journal_entries je
       JOIN journals j ON j.id = je.journal_id
       LEFT JOIN contacts c ON c.id = je.partner_id
       WHERE je.id = $1`,
      [req.params.id]
    );
    if (entryResult.rows.length === 0) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    const linesResult = await query(
      `SELECT jel.*, coa.name AS account_name, coa.account_type, c.name AS partner_name, aa.name AS analytic_account_name
       FROM journal_entry_lines jel
       JOIN chart_of_accounts coa ON coa.id = jel.account_id
       LEFT JOIN contacts c ON c.id = jel.partner_id
       LEFT JOIN analytic_accounts aa ON aa.id = jel.analytic_account_id
       WHERE jel.journal_entry_id = $1
       ORDER BY jel.id ASC`,
      [req.params.id]
    );

    return res.json({
      data: {
        ...entryResult.rows[0],
        lines: linesResult.rows,
      },
    });
  } catch (err) {
    console.error("journalEntries.getById error", err);
    return res.status(500).json({ message: "Failed to load journal entry" });
  }
}

async function create(req, res) {
  const { journal_id, entry_date, reference, partner_id, lines } = req.body;

  if (!journal_id || !Array.isArray(lines) || lines.length < 2) {
    return res.status(400).json({ message: "journal_id and at least 2 lines are required" });
  }

  try {
    const result = await withTransaction(async (client) => {
      const entryNumber = await nextDocumentNumber(client, "JE");
      const entryRes = await client.query(
        `INSERT INTO journal_entries (entry_number, journal_id, entry_date, reference, partner_id, status)
         VALUES ($1, $2, $3, $4, $5, 'DRAFT')
         RETURNING *`,
        [entryNumber, journal_id, entry_date || new Date(), reference || null, partner_id || null]
      );
      const entry = entryRes.rows[0];

      for (const line of lines) {
        const debit = Number(line.debit) || 0;
        const credit = Number(line.credit) || 0;
        if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
          throw new Error("Each line must have exactly one of debit or credit positive");
        }
        await client.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, partner_id, analytic_account_id, debit, credit)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [entry.id, line.account_id, line.partner_id || partner_id || null, line.analytic_account_id || null, debit, credit]
        );
      }

      return entry;
    });

    return res.status(201).json({ data: result });
  } catch (err) {
    console.error("journalEntries.create error", err);
    return res.status(400).json({ message: err.message || "Failed to create journal entry" });
  }
}

async function postEntry(req, res) {
  try {
    const result = await withTransaction(async (client) => {
      const entryRes = await client.query(
        "SELECT * FROM journal_entries WHERE id = $1 FOR UPDATE",
        [req.params.id]
      );
      if (entryRes.rows.length === 0) {
        throw new Error("Journal entry not found");
      }
      const entry = entryRes.rows[0];
      if (entry.status !== "DRAFT") {
        throw new Error(`Cannot post entry with status ${entry.status}`);
      }

      const sumRes = await client.query(
        `SELECT COALESCE(SUM(debit), 0)::numeric AS total_debit,
                COALESCE(SUM(credit), 0)::numeric AS total_credit
         FROM journal_entry_lines
         WHERE journal_entry_id = $1`,
        [entry.id]
      );

      const { total_debit, total_credit } = sumRes.rows[0];
      if (Number(total_debit) !== Number(total_credit) || Number(total_debit) <= 0) {
        throw new Error(`Total debit (${total_debit}) must equal total credit (${total_credit}) and be > 0`);
      }

      const updateRes = await client.query(
        "UPDATE journal_entries SET status = 'POSTED' WHERE id = $1 RETURNING *",
        [entry.id]
      );

      return updateRes.rows[0];
    });

    return res.json({ data: result });
  } catch (err) {
    console.error("journalEntries.postEntry error", err);
    return res.status(400).json({ message: err.message || "Failed to post journal entry" });
  }
}

async function cancelEntry(req, res) {
  try {
    const result = await query(
      "UPDATE journal_entries SET status = 'CANCELLED' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Journal entry not found" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("journalEntries.cancelEntry error", err);
    return res.status(500).json({ message: "Failed to cancel journal entry" });
  }
}

module.exports = { list, getById, create, postEntry, cancelEntry };
