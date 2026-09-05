const { query, withTransaction } = require("../config/db");
const { nextDocumentNumber } = require("../utils/documentNumber");

async function list(req, res) {
  const { page = 1, pageSize = 20, search = "", customer_id, status } = req.query;
  const limit = Math.min(Number(pageSize) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(so.so_number ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }
  if (customer_id) {
    params.push(customer_id);
    conditions.push(`so.customer_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`so.status = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const countResult = await query(
      `SELECT COUNT(*)::int AS total 
       FROM sales_orders so
       JOIN contacts c ON c.id = so.customer_id
       ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const rowsResult = await query(
      `SELECT so.*, c.name AS customer_name, c.email AS customer_email
       FROM sales_orders so
       JOIN contacts c ON c.id = so.customer_id
       ${whereClause}
       ORDER BY so.so_date DESC, so.id DESC
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
    console.error("salesOrders.list error", err);
    return res.status(500).json({ message: "Failed to list sales orders" });
  }
}

async function getById(req, res) {
  try {
    const soResult = await query(
      `SELECT so.*, c.name AS customer_name, c.email AS customer_email, c.mobile AS customer_mobile
       FROM sales_orders so
       JOIN contacts c ON c.id = so.customer_id
       WHERE so.id = $1`,
      [req.params.id]
    );
    if (soResult.rows.length === 0) {
      return res.status(404).json({ message: "Sales order not found" });
    }

    const linesResult = await query(
      `SELECT sol.*, p.name AS product_name, p.product_type, aa.name AS analytic_account_name
       FROM sales_order_lines sol
       JOIN products p ON p.id = sol.product_id
       LEFT JOIN analytic_accounts aa ON aa.id = sol.analytic_account_id
       WHERE sol.sales_order_id = $1
       ORDER BY sol.id ASC`,
      [req.params.id]
    );

    return res.json({
      data: {
        ...soResult.rows[0],
        lines: linesResult.rows,
      },
    });
  } catch (err) {
    console.error("salesOrders.getById error", err);
    return res.status(500).json({ message: "Failed to load sales order" });
  }
}

async function create(req, res) {
  const { customer_id, so_date, payment_terms, lines } = req.body;

  if (!customer_id || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ message: "customer_id and at least one line item are required" });
  }

  try {
    const result = await withTransaction(async (client) => {
      let subtotal = 0;
      let taxTotal = 0;

      const processedLines = lines.map((line) => {
        const qty = Number(line.quantity) || 0;
        const price = Number(line.unit_price) || 0;
        const taxRate = Number(line.tax_rate) || 0;
        const lineSubtotal = qty * price;
        const tax = lineSubtotal * (taxRate / 100);
        const lineTotal = lineSubtotal + tax;
        subtotal += lineSubtotal;
        taxTotal += tax;
        return {
          product_id: line.product_id,
          analytic_account_id: line.analytic_account_id || null,
          quantity: qty,
          unit_price: price,
          tax_rate: taxRate,
          tax_amount: tax,
          line_total: lineTotal,
        };
      });

      const totalAmount = subtotal + taxTotal;
      const soNumber = await nextDocumentNumber(client, "SO");

      const soRes = await client.query(
        `INSERT INTO sales_orders (so_number, customer_id, so_date, payment_terms, status, subtotal, tax_amount, total_amount)
         VALUES ($1, $2, $3, $4, 'DRAFT', $5, $6, $7)
         RETURNING *`,
        [soNumber, customer_id, so_date || new Date(), payment_terms || null, subtotal, taxTotal, totalAmount]
      );

      const so = soRes.rows[0];

      for (const line of processedLines) {
        await client.query(
          `INSERT INTO sales_order_lines (sales_order_id, product_id, analytic_account_id, quantity, unit_price, tax_rate, tax_amount, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [so.id, line.product_id, line.analytic_account_id, line.quantity, line.unit_price, line.tax_rate, line.tax_amount, line.line_total]
        );
      }

      return so;
    });

    return res.status(201).json({ data: result });
  } catch (err) {
    console.error("salesOrders.create error", err);
    return res.status(400).json({ message: err.message || "Failed to create sales order" });
  }
}

async function confirmOrder(req, res) {
  try {
    const result = await query(
      "UPDATE sales_orders SET status = 'CONFIRMED' WHERE id = $1 AND status = 'DRAFT' RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Sales order not found or not in DRAFT status" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("salesOrders.confirmOrder error", err);
    return res.status(500).json({ message: "Failed to confirm sales order" });
  }
}

async function cancelOrder(req, res) {
  try {
    const result = await query(
      "UPDATE sales_orders SET status = 'CANCELLED' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Sales order not found" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("salesOrders.cancelOrder error", err);
    return res.status(500).json({ message: "Failed to cancel sales order" });
  }
}

module.exports = { list, getById, create, confirmOrder, cancelOrder };
