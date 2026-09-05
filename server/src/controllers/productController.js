const { query } = require("../config/db");

const ALLOWED_TYPES = ["GOODS", "SERVICE", "COMBO"];

async function list(req, res) {
  const { page = 1, pageSize = 20, search = "", category_id, product_type } = req.query;
  const limit = Math.min(Number(pageSize) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const conditions = ["p.is_active = TRUE"];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`p.name ILIKE $${params.length}`);
  }
  if (category_id) {
    params.push(category_id);
    conditions.push(`p.category_id = $${params.length}`);
  }
  if (product_type && ALLOWED_TYPES.includes(product_type)) {
    params.push(product_type);
    conditions.push(`p.product_type = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM products p ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const rowsResult = await query(
      `SELECT p.id, p.name, p.category_id, pc.name AS category_name, p.product_type, 
              p.sales_price, p.cost_price, p.image, p.is_active, p.created_at,
              COALESCE(SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE -sm.quantity END), 0)::numeric AS current_stock
       FROM products p
       LEFT JOIN product_categories pc ON pc.id = p.category_id
       LEFT JOIN stock_movements sm ON sm.product_id = p.id
       ${whereClause}
       GROUP BY p.id, pc.name
       ORDER BY p.name ASC
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
    console.error("products.list error", err);
    return res.status(500).json({ message: "Failed to list products" });
  }
}

async function getById(req, res) {
  try {
    const result = await query(
      `SELECT p.*, pc.name AS category_name,
              COALESCE(SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE -sm.quantity END), 0)::numeric AS current_stock
       FROM products p
       LEFT JOIN product_categories pc ON pc.id = p.category_id
       LEFT JOIN stock_movements sm ON sm.product_id = p.id
       WHERE p.id = $1
       GROUP BY p.id, pc.name`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("products.getById error", err);
    return res.status(500).json({ message: "Failed to load product" });
  }
}

async function create(req, res) {
  const { name, category_id, product_type, sales_price, cost_price, image } = req.body;

  if (!name || !product_type) {
    return res.status(400).json({ message: "name and product_type are required" });
  }
  if (!ALLOWED_TYPES.includes(product_type)) {
    return res.status(400).json({ message: `product_type must be one of ${ALLOWED_TYPES.join(", ")}` });
  }

  try {
    const result = await query(
      `INSERT INTO products (name, category_id, product_type, sales_price, cost_price, image)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name,
        category_id || null,
        product_type,
        Number(sales_price) || 0,
        Number(cost_price) || 0,
        image || null,
      ]
    );
    return res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error("products.create error", err);
    return res.status(500).json({ message: "Failed to create product" });
  }
}

async function update(req, res) {
  const { name, category_id, product_type, sales_price, cost_price, image } = req.body;

  if (product_type && !ALLOWED_TYPES.includes(product_type)) {
    return res.status(400).json({ message: `product_type must be one of ${ALLOWED_TYPES.join(", ")}` });
  }

  try {
    const result = await query(
      `UPDATE products SET
         name = COALESCE($1, name),
         category_id = COALESCE($2, category_id),
         product_type = COALESCE($3, product_type),
         sales_price = COALESCE($4, sales_price),
         cost_price = COALESCE($5, cost_price),
         image = COALESCE($6, image)
       WHERE id = $7
       RETURNING *`,
      [name, category_id, product_type, sales_price, cost_price, image, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("products.update error", err);
    return res.status(500).json({ message: "Failed to update product" });
  }
}

async function archive(req, res) {
  try {
    const result = await query(
      "UPDATE products SET is_active = FALSE WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("products.archive error", err);
    return res.status(500).json({ message: "Failed to archive product" });
  }
}

module.exports = { list, getById, create, update, archive };
