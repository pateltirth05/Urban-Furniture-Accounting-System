const { query } = require("../config/db");

const ALLOWED_TYPES = ["SALES", "PURCHASE", "BANK", "CASH", "GENERAL"];

async function list(req, res) {
  try {
    const result = await query(
      `SELECT j.*, coa.name AS default_account_name
       FROM journals j
       LEFT JOIN chart_of_accounts coa ON coa.id = j.default_account_id
       WHERE j.is_active = TRUE
       ORDER BY j.name ASC`
    );
    return res.json({ data: result.rows });
  } catch (err) {
    console.error("journals.list error", err);
    return res.status(500).json({ message: "Failed to list journals" });
  }
}

async function getById(req, res) {
  try {
    const result = await query(
      `SELECT j.*, coa.name AS default_account_name
       FROM journals j
       LEFT JOIN chart_of_accounts coa ON coa.id = j.default_account_id
       WHERE j.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Journal not found" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("journals.getById error", err);
    return res.status(500).json({ message: "Failed to load journal" });
  }
}

async function create(req, res) {
  const { name, journal_type, default_account_id } = req.body;

  if (!name || !journal_type) {
    return res.status(400).json({ message: "name and journal_type are required" });
  }
  if (!ALLOWED_TYPES.includes(journal_type)) {
    return res.status(400).json({ message: `journal_type must be one of ${ALLOWED_TYPES.join(", ")}` });
  }

  try {
    const result = await query(
      `INSERT INTO journals (name, journal_type, default_account_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, journal_type, default_account_id || null]
    );
    return res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Journal with this name already exists" });
    }
    console.error("journals.create error", err);
    return res.status(500).json({ message: "Failed to create journal" });
  }
}

async function update(req, res) {
  const { name, journal_type, default_account_id } = req.body;

  if (journal_type && !ALLOWED_TYPES.includes(journal_type)) {
    return res.status(400).json({ message: `journal_type must be one of ${ALLOWED_TYPES.join(", ")}` });
  }

  try {
    const result = await query(
      `UPDATE journals SET
         name = COALESCE($1, name),
         journal_type = COALESCE($2, journal_type),
         default_account_id = COALESCE($3, default_account_id)
       WHERE id = $4
       RETURNING *`,
      [name, journal_type, default_account_id, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Journal not found" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("journals.update error", err);
    return res.status(500).json({ message: "Failed to update journal" });
  }
}

module.exports = { list, getById, create, update };
