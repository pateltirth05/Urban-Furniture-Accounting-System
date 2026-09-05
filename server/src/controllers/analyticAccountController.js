const { query } = require("../config/db");

const ALLOWED_TYPES = ["INCOME", "EXPENSE"];

async function list(req, res) {
  try {
    const result = await query("SELECT * FROM analytic_accounts WHERE is_active = TRUE ORDER BY name ASC");
    return res.json({ data: result.rows });
  } catch (err) {
    console.error("analyticAccounts.list error", err);
    return res.status(500).json({ message: "Failed to list analytic accounts" });
  }
}

async function getById(req, res) {
  try {
    const result = await query("SELECT * FROM analytic_accounts WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Analytic account not found" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("analyticAccounts.getById error", err);
    return res.status(500).json({ message: "Failed to load analytic account" });
  }
}

async function create(req, res) {
  const { name, type } = req.body;
  if (!name || !type) {
    return res.status(400).json({ message: "name and type are required" });
  }
  if (!ALLOWED_TYPES.includes(type)) {
    return res.status(400).json({ message: `type must be one of ${ALLOWED_TYPES.join(", ")}` });
  }

  try {
    const result = await query(
      "INSERT INTO analytic_accounts (name, type) VALUES ($1, $2) RETURNING *",
      [name, type]
    );
    return res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Analytic account with this name already exists" });
    }
    console.error("analyticAccounts.create error", err);
    return res.status(500).json({ message: "Failed to create analytic account" });
  }
}

async function update(req, res) {
  const { name, type } = req.body;
  if (type && !ALLOWED_TYPES.includes(type)) {
    return res.status(400).json({ message: `type must be one of ${ALLOWED_TYPES.join(", ")}` });
  }

  try {
    const result = await query(
      `UPDATE analytic_accounts SET
         name = COALESCE($1, name),
         type = COALESCE($2, type)
       WHERE id = $3
       RETURNING *`,
      [name, type, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Analytic account not found" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("analyticAccounts.update error", err);
    return res.status(500).json({ message: "Failed to update analytic account" });
  }
}

async function archive(req, res) {
  try {
    const result = await query(
      "UPDATE analytic_accounts SET is_active = FALSE WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Analytic account not found" });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("analyticAccounts.archive error", err);
    return res.status(500).json({ message: "Failed to archive analytic account" });
  }
}

module.exports = { list, getById, create, update, archive };
