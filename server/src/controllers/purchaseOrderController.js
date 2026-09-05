const { query, withTransaction } = require("../config/db");
const { nextDocumentNumber } = require("../utils/documentNumber");

async function list(req, res) {
  const { page = 1, pageSize = 20, search = "", vendor_id, status } = req.query;
  const limit = Math.min(Number(pageSize) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(po.po_number ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }
  if (vendor_id) {
    params.push(vendor_id);
    conditions.push(`po.vendor_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`po.status = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const countResult = await query(
      `SELECT COUNT(*)::int AS total 
       FROM purchase_orders po
       JOIN contacts c ON c.id = po.vendor_id
       ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const rowsResult = await query(
      `SELECT po.*, c.name AS vendor_name, c.email AS vendor_email
       FROM purchase_orders po
       JOIN contacts c ON c.id = po.vendor_id
       ${whereClause}
       ORDER BY po.po_date DESC, po.id DESC
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
    console.error("purchaseOrders.list error", err);
    return res.status(500).json({ message: "Failed to list purchase orders" });
  }
}

async function getById(req, res) {
  try {
    const poResult = await query(
      `SELECT po.*, c.name AS vendor_name, c.email AS vendor_email, c.mobile AS vendor_mobile
       FROM purchase_orders po
       JOIN contacts c ON c.id = po.vendor_id
       WHERE po.id = $1`,
      [req.params.id]
    );
    if (poResult.rows.length === 0) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    const linesResult = await query(
      `SELECT pol.*, p.name AS product_name, p.product_type, aa.name AS analytic_account_name
       FROM purchase_order_lines pol
       JOIN products p ON p.id = pol.product_id
       LEFT JOIN analytic_accounts aa ON aa.id = pol.analytic_account_id
       WHERE pol.purchase_order_id = $1
       ORDER BY pol.id ASC`,
      [req.params.id]
    );

    return res.json({
      data: {
        ...poResult.rows[0],
        lines: linesResult.rows,
      },
    });
  } catch (err) {
    console.error("purchaseOrders.getById error", err);
    return res.status(500).json({ message: "Failed to load purchase order" });
  }
}

async function create(req, res) {
  const { vendor_id, po_date, payment_terms, lines } = req.body;

  if (!vendor_id || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ message: "vendor_id and at least one line item are required" });
  }

  try {
    const result = await withTransaction(async (client) => {
      let subtotal = 0;
      let taxTotal = 0;

      const processedLines = lines.map((line) => {
        const qty = Number(line.quantity) || 0;
        const price = Number(line.unit_price) || 0;
        const tax = Number(line.tax_amount) || 0;
        const lineTotal = qty * price + tax;
        subtotal += qty * price;
        taxTotal += tax;
        return {
          product_id: line.product_id,
          analytic_account_id: line.analytic_account_id || null,
          quantity: qty,
          unit_price: price,
          tax_amount: tax,
          line_total: lineTotal,
        };
      });

      const totalAmount = subtotal + taxTotal;
      const poNumber = await nextDocumentNumber(client, "PO");

      const poRes = await client.query(
        `INSERT INTO purchase_orders (po_number, vendor_id, po_date, payment_terms, status, subtotal, tax_amount, total_amount)
         VALUES ($1, $2, $3, $4, 'DRAFT', $5, $6, $7)
         RETURNING *`,
        [poNumber, vendor_id, po_date || new Date(), payment_terms || null, subtotal, taxTotal, totalAmount]
      );

      const po = poRes.rows[0];

      for (const line of processedLines) {
        await client.query(
          `INSERT INTO purchase_order_lines (purchase_order_id, product_id, analytic_account_id, quantity, unit_price, tax_amount, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [po.id, line.product_id, line.analytic_account_id, line.quantity, line.unit_price, line.tax_amount, line.line_total]
        );
      }

      return po;
    });

    return res.status(201).json({ data: result });
  } catch (err) {
    console.error("purchaseOrders.create error", err);
    return res.status(400).json({ message: err.message || "Failed to create purchase order" });
  }
}

async function confirmOrder(req, res) {
  try {
    const result = await query(
      "UPDATE purchase_orders SET status = 'CONFIRMED' WHERE id = $1 AND status = 'DRAFT' RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Purchase order not found or not in DRAFT status" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("purchaseOrders.confirmOrder error", err);
    return res.status(500).json({ message: "Failed to confirm purchase order" });
  }
}

async function cancelOrder(req, res) {
  try {
    const result = await query(
      "UPDATE purchase_orders SET status = 'CANCELLED' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Purchase order not found" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("purchaseOrders.cancelOrder error", err);
    return res.status(500).json({ message: "Failed to cancel purchase order" });
  }
}

module.exports = { list, getById, create, confirmOrder, cancelOrder };
