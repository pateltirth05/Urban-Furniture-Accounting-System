const { query } = require("../config/db");

const ALLOWED_TYPES = ["ASSET", "LIABILITY", "CAPITAL", "INCOME", "EXPENSE"];

async function list(req, res) {
  const { account_type } = req.query;
  const conditions = ["is_active = TRUE"];
  const params = [];

  if (account_type && ALLOWED_TYPES.includes(account_type)) {
    params.push(account_type);
    conditions.push(`account_type = $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  try {
    const result = await query(
      `SELECT * FROM chart_of_accounts ${whereClause} ORDER BY name ASC`,
      params
    );
    return res.json({ data: result.rows });
  } catch (err) {
    console.error("chartOfAccounts.list error", err);
    return res.status(500).json({ message: "Failed to list chart of accounts" });
  }
}

async function getById(req, res) {
  try {
    const result = await query("SELECT * FROM chart_of_accounts WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Account not found" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("chartOfAccounts.getById error", err);
    return res.status(500).json({ message: "Failed to load account" });
  }
}

async function create(req, res) {
  const { name, account_type, account_subtype } = req.body;

  if (!name || !account_type) {
    return res.status(400).json({ message: "name and account_type are required" });
  }
  if (!ALLOWED_TYPES.includes(account_type)) {
    return res.status(400).json({ message: `account_type must be one of ${ALLOWED_TYPES.join(", ")}` });
  }

  try {
    const result = await query(
      `INSERT INTO chart_of_accounts (name, account_type, account_subtype)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, account_type, account_subtype || null]
    );
    return res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Account with this name already exists" });
    }
    console.error("chartOfAccounts.create error", err);
    return res.status(500).json({ message: "Failed to create account" });
  }
}

async function update(req, res) {
  const { name, account_type, account_subtype } = req.body;

  if (account_type && !ALLOWED_TYPES.includes(account_type)) {
    return res.status(400).json({ message: `account_type must be one of ${ALLOWED_TYPES.join(", ")}` });
  }

  try {
    const result = await query(
      `UPDATE chart_of_accounts SET
         name = COALESCE($1, name),
         account_type = COALESCE($2, account_type),
         account_subtype = COALESCE($3, account_subtype)
       WHERE id = $4
       RETURNING *`,
      [name, account_type, account_subtype, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Account not found" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("chartOfAccounts.update error", err);
    return res.status(500).json({ message: "Failed to update account" });
  }
}

async function archive(req, res) {
  try {
    const result = await query(
      "UPDATE chart_of_accounts SET is_active = FALSE WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Account not found" });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("chartOfAccounts.archive error", err);
    return res.status(500).json({ message: "Failed to archive account" });
  }
}

module.exports = { list, getById, create, update, archive };
