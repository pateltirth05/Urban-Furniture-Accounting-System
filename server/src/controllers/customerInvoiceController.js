const { query, withTransaction } = require("../config/db");
const { nextDocumentNumber } = require("../utils/documentNumber");

async function list(req, res) {
  const { page = 1, pageSize = 20, search = "", customer_id, status } = req.query;
  const limit = Math.min(Number(pageSize) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const conditions = [];
  const params = [];

  // Customer Portal Security: CONTACT role users can ONLY view their own customer record's invoices
  if (req.user.role === "CONTACT") {
    if (!req.user.contactId) {
      return res.status(403).json({ message: "Contact profile not linked to user" });
    }
    params.push(req.user.contactId);
    conditions.push(`ci.customer_id = $${params.length}`);
  } else if (customer_id) {
    params.push(customer_id);
    conditions.push(`ci.customer_id = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(ci.invoice_number ILIKE $${params.length} OR ci.invoice_reference ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    conditions.push(`ci.status = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const countResult = await query(
      `SELECT COUNT(*)::int AS total 
       FROM customer_invoices ci
       JOIN contacts c ON c.id = ci.customer_id
       ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const rowsResult = await query(
      `SELECT ci.*, c.name AS customer_name, c.email AS customer_email
       FROM customer_invoices ci
       JOIN contacts c ON c.id = ci.customer_id
       ${whereClause}
       ORDER BY ci.invoice_date DESC, ci.id DESC
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
    console.error("customerInvoices.list error", err);
    return res.status(500).json({ message: "Failed to list customer invoices" });
  }
}

async function getById(req, res) {
  try {
    const conditions = ["ci.id = $1"];
    const params = [req.params.id];

    if (req.user.role === "CONTACT") {
      params.push(req.user.contactId);
      conditions.push(`ci.customer_id = $2`);
    }

    const invResult = await query(
      `SELECT ci.*, c.name AS customer_name, c.email AS customer_email, c.mobile AS customer_mobile, c.street, c.city, c.state, c.pincode
       FROM customer_invoices ci
       JOIN contacts c ON c.id = ci.customer_id
       WHERE ${conditions.join(" AND ")}`,
      params
    );
    if (invResult.rows.length === 0) {
      return res.status(404).json({ message: "Customer invoice not found" });
    }

    const linesResult = await query(
      `SELECT cil.*, p.name AS product_name, p.product_type, coa.name AS account_name, aa.name AS analytic_account_name
       FROM customer_invoice_lines cil
       JOIN products p ON p.id = cil.product_id
       LEFT JOIN chart_of_accounts coa ON coa.id = cil.account_id
       LEFT JOIN analytic_accounts aa ON aa.id = cil.analytic_account_id
       WHERE cil.invoice_id = $1
       ORDER BY cil.id ASC`,
      [req.params.id]
    );

    return res.json({
      data: {
        ...invResult.rows[0],
        lines: linesResult.rows,
      },
    });
  } catch (err) {
    console.error("customerInvoices.getById error", err);
    return res.status(500).json({ message: "Failed to load customer invoice" });
  }
}

async function create(req, res) {
  const { sales_order_id, customer_id, invoice_reference, invoice_date, due_date, lines } = req.body;

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
          account_id: line.account_id || null,
          analytic_account_id: line.analytic_account_id || null,
          quantity: qty,
          unit_price: price,
          tax_rate: taxRate,
          tax_amount: tax,
          line_total: lineTotal,
        };
      });

      const totalAmount = subtotal + taxTotal;
      const invNumber = await nextDocumentNumber(client, "INV");

      const invRes = await client.query(
        `INSERT INTO customer_invoices (
           invoice_number, sales_order_id, customer_id, invoice_reference, invoice_date, due_date,
           status, subtotal, tax_amount, total_amount, amount_paid, amount_due
         )
         VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT', $7, $8, $9, 0, $9)
         RETURNING *`,
        [
          invNumber,
          sales_order_id || null,
          customer_id,
          invoice_reference || null,
          invoice_date || new Date(),
          due_date || null,
          subtotal,
          taxTotal,
          totalAmount,
        ]
      );

      const inv = invRes.rows[0];

      for (const line of processedLines) {
        await client.query(
          `INSERT INTO customer_invoice_lines (invoice_id, product_id, account_id, analytic_account_id, quantity, unit_price, tax_rate, tax_amount, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [inv.id, line.product_id, line.account_id, line.analytic_account_id, line.quantity, line.unit_price, line.tax_rate, line.tax_amount, line.line_total]
        );
      }

      return inv;
    });

    return res.status(201).json({ data: result });
  } catch (err) {
    console.error("customerInvoices.create error", err);
    return res.status(400).json({ message: err.message || "Failed to create customer invoice" });
  }
}

async function confirmInvoice(req, res) {
  try {
    const result = await withTransaction(async (client) => {
      const invRes = await client.query(
        "SELECT * FROM customer_invoices WHERE id = $1 FOR UPDATE",
        [req.params.id]
      );
      if (invRes.rows.length === 0) {
        throw new Error("Customer invoice not found");
      }
      const inv = invRes.rows[0];
      if (inv.status !== "DRAFT") {
        throw new Error(`Cannot confirm invoice with status ${inv.status}`);
      }

      const linesRes = await client.query(
        `SELECT cil.*, p.product_type 
         FROM customer_invoice_lines cil
         JOIN products p ON p.id = cil.product_id
         WHERE cil.invoice_id = $1`,
        [inv.id]
      );
      const lines = linesRes.rows;

      // 1. Get Accounts
      const debtAccRes = await client.query("SELECT id FROM chart_of_accounts WHERE name = 'Debtors' LIMIT 1");
      const salesAccRes = await client.query("SELECT id FROM chart_of_accounts WHERE name = 'Sales Income' LIMIT 1");
      const journalRes = await client.query("SELECT id FROM journals WHERE journal_type = 'SALES' LIMIT 1");

      const debtAccId = debtAccRes.rows[0]?.id;
      const salesAccId = salesAccRes.rows[0]?.id;
      const journalId = journalRes.rows[0]?.id;

      if (!debtAccId || !salesAccId || !journalId) {
        throw new Error("Missing default Chart of Accounts or Sales Journal");
      }

      // 2. Create Journal Entry
      const jeNumber = await nextDocumentNumber(client, "JE");
      const jeRes = await client.query(
        `INSERT INTO journal_entries (entry_number, journal_id, entry_date, reference, partner_id, status)
         VALUES ($1, $2, $3, $4, $5, 'POSTED')
         RETURNING id`,
        [jeNumber, journalId, inv.invoice_date, `Customer Invoice ${inv.invoice_number}`, inv.customer_id]
      );
      const jeId = jeRes.rows[0].id;

      // Debit Debtors
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, partner_id, debit, credit)
         VALUES ($1, $2, $3, $4, 0)`,
        [jeId, debtAccId, inv.customer_id, inv.total_amount]
      );

      // Credit Sales Income
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, partner_id, debit, credit)
         VALUES ($1, $2, $3, 0, $4)`,
        [jeId, salesAccId, inv.customer_id, inv.subtotal]
      );

      // Credit Tax if any
      if (Number(inv.tax_amount) > 0) {
        const taxAccRes = await client.query("SELECT id FROM chart_of_accounts WHERE name = 'Tax Payable' LIMIT 1");
        const taxAccId = taxAccRes.rows[0]?.id || salesAccId;
        await client.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, partner_id, debit, credit)
           VALUES ($1, $2, $3, 0, $4)`,
          [jeId, taxAccId, inv.customer_id, inv.tax_amount]
        );
      }

      // 3. Stock OUT for GOODS
      for (const line of lines) {
        if (line.product_type === "GOODS") {
          await client.query(
            `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, movement_date)
             VALUES ($1, 'OUT', $2, 'CUSTOMER_INVOICE', $3, $4)`,
            [line.product_id, line.quantity, inv.id, inv.invoice_date]
          );
        }
      }

      // 4. Update linked SO if exists
      if (inv.sales_order_id) {
        await client.query(
          "UPDATE sales_orders SET status = 'INVOICED' WHERE id = $1",
          [inv.sales_order_id]
        );
      }

      // 5. Update Invoice status
      const updatedInvRes = await client.query(
        "UPDATE customer_invoices SET status = 'CONFIRMED' WHERE id = $1 RETURNING *",
        [inv.id]
      );

      return updatedInvRes.rows[0];
    });

    return res.json({ data: result });
  } catch (err) {
    console.error("customerInvoices.confirmInvoice error", err);
    return res.status(400).json({ message: err.message || "Failed to confirm customer invoice" });
  }
}

async function cancelInvoice(req, res) {
  try {
    const result = await query(
      "UPDATE customer_invoices SET status = 'CANCELLED' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Customer invoice not found" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("customerInvoices.cancelInvoice error", err);
    return res.status(500).json({ message: "Failed to cancel customer invoice" });
  }
}

module.exports = { list, getById, create, confirmInvoice, cancelInvoice };
