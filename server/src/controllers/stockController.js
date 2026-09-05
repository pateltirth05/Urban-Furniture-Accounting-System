const { query } = require("../config/db");

async function getStockReport(req, res) {
  const { search = "", category_id } = req.query;
  const conditions = ["p.is_active = TRUE", "p.product_type = 'GOODS'"];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`p.name ILIKE $${params.length}`);
  }
  if (category_id) {
    params.push(category_id);
    conditions.push(`p.category_id = $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  try {
    const result = await query(
      `SELECT p.id, p.name, p.sales_price, p.cost_price, pc.name AS category_name,
              COALESCE(SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE 0 END), 0)::numeric AS total_in,
              COALESCE(SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity ELSE 0 END), 0)::numeric AS total_out,
              COALESCE(SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE -sm.quantity END), 0)::numeric AS current_stock
       FROM products p
       LEFT JOIN product_categories pc ON pc.id = p.category_id
       LEFT JOIN stock_movements sm ON sm.product_id = p.id
       ${whereClause}
       GROUP BY p.id, pc.name
       ORDER BY p.name ASC`,
      params
    );
    return res.json({ data: result.rows });
  } catch (err) {
    console.error("stock.getStockReport error", err);
    return res.status(500).json({ message: "Failed to load stock report" });
  }
}

async function getMovements(req, res) {
  const { product_id, page = 1, pageSize = 20 } = req.query;
  const limit = Math.min(Number(pageSize) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const conditions = [];
  const params = [];

  if (product_id) {
    params.push(product_id);
    conditions.push(`sm.product_id = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM stock_movements sm ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const rowsResult = await query(
      `SELECT sm.*, p.name AS product_name
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       ${whereClause}
       ORDER BY sm.movement_date DESC, sm.id DESC
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
    console.error("stock.getMovements error", err);
    return res.status(500).json({ message: "Failed to load stock movements" });
  }
}

module.exports = { getStockReport, getMovements };
