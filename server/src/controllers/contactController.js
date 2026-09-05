const { query } = require("../config/db");

/**
 * Reference CRUD implementation. Other master-data controllers
 * (products, chart of accounts, journals, analytic accounts) should
 * follow this same pattern: SQL-level pagination/search/filter,
 * backend validation, never trust client-supplied IDs for anything
 * beyond "which row to act on".
 */

const ALLOWED_TYPES = ["CUSTOMER", "VENDOR", "BOTH"];

async function list(req, res) {
  const { page = 1, pageSize = 20, search = "", type } = req.query;
  const limit = Math.min(Number(pageSize) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const conditions = ["is_active = TRUE"];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }
  if (type && ALLOWED_TYPES.includes(type)) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM contacts ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const rowsResult = await query(
      `SELECT id, name, type, email, mobile, city, state, is_active, created_at
       FROM contacts ${whereClause}
       ORDER BY name ASC
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
    console.error("contacts.list error", err);
    return res.status(500).json({ message: "Failed to list contacts" });
  }
}

async function getById(req, res) {
  try {
    const result = await query("SELECT * FROM contacts WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Contact not found" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("contacts.getById error", err);
    return res.status(500).json({ message: "Failed to load contact" });
  }
}

async function create(req, res) {
  const { name, type, email, mobile, street, city, state, pincode, profile_image } = req.body;

  if (!name || !type) {
    return res.status(400).json({ message: "name and type are required" });
  }
  if (!ALLOWED_TYPES.includes(type)) {
    return res.status(400).json({ message: `type must be one of ${ALLOWED_TYPES.join(", ")}` });
  }

  try {
    const result = await query(
      `INSERT INTO contacts (name, type, email, mobile, street, city, state, pincode, profile_image)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [name, type, email ?? null, mobile ?? null, street ?? null, city ?? null, state ?? null, pincode ?? null, profile_image ?? null]
    );
    return res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "A contact with this email already exists" });
    }
    console.error("contacts.create error", err);
    return res.status(500).json({ message: "Failed to create contact" });
  }
}

async function update(req, res) {
  const { name, type, email, mobile, street, city, state, pincode, profile_image } = req.body;

  if (type && !ALLOWED_TYPES.includes(type)) {
    return res.status(400).json({ message: `type must be one of ${ALLOWED_TYPES.join(", ")}` });
  }

  try {
    const result = await query(
      `UPDATE contacts SET
         name = COALESCE($1, name),
         type = COALESCE($2, type),
         email = COALESCE($3, email),
         mobile = COALESCE($4, mobile),
         street = COALESCE($5, street),
         city = COALESCE($6, city),
         state = COALESCE($7, state),
         pincode = COALESCE($8, pincode),
         profile_image = COALESCE($9, profile_image)
       WHERE id = $10
       RETURNING *`,
      [name, type, email, mobile, street, city, state, pincode, profile_image, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Contact not found" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("contacts.update error", err);
    return res.status(500).json({ message: "Failed to update contact" });
  }
}

/**
 * Contacts are archived, not hard-deleted (README golden rule #14),
 * since they're referenced by orders/bills/invoices and journal lines.
 */
async function archive(req, res) {
  try {
    const result = await query(
      "UPDATE contacts SET is_active = FALSE WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Contact not found" });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("contacts.archive error", err);
    return res.status(500).json({ message: "Failed to archive contact" });
  }
}

module.exports = { list, getById, create, update, archive };
