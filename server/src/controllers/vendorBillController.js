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
    conditions.push(`(vb.bill_number ILIKE $${params.length} OR vb.bill_reference ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }
  if (vendor_id) {
    params.push(vendor_id);
    conditions.push(`vb.vendor_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`vb.status = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const countResult = await query(
      `SELECT COUNT(*)::int AS total 
       FROM vendor_bills vb
       JOIN contacts c ON c.id = vb.vendor_id
       ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const rowsResult = await query(
      `SELECT vb.*, c.name AS vendor_name, c.email AS vendor_email
       FROM vendor_bills vb
       JOIN contacts c ON c.id = vb.vendor_id
       ${whereClause}
       ORDER BY vb.bill_date DESC, vb.id DESC
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
    console.error("vendorBills.list error", err);
    return res.status(500).json({ message: "Failed to list vendor bills" });
  }
}

async function getById(req, res) {
  try {
    const billResult = await query(
      `SELECT vb.*, c.name AS vendor_name, c.email AS vendor_email, c.mobile AS vendor_mobile
       FROM vendor_bills vb
       JOIN contacts c ON c.id = vb.vendor_id
       WHERE vb.id = $1`,
      [req.params.id]
    );
    if (billResult.rows.length === 0) {
      return res.status(404).json({ message: "Vendor bill not found" });
    }

    const linesResult = await query(
      `SELECT vbl.*, p.name AS product_name, p.product_type, coa.name AS account_name, aa.name AS analytic_account_name
       FROM vendor_bill_lines vbl
       JOIN products p ON p.id = vbl.product_id
       LEFT JOIN chart_of_accounts coa ON coa.id = vbl.account_id
       LEFT JOIN analytic_accounts aa ON aa.id = vbl.analytic_account_id
       WHERE vbl.vendor_bill_id = $1
       ORDER BY vbl.id ASC`,
      [req.params.id]
    );

    return res.json({
      data: {
        ...billResult.rows[0],
        lines: linesResult.rows,
      },
    });
  } catch (err) {
    console.error("vendorBills.getById error", err);
    return res.status(500).json({ message: "Failed to load vendor bill" });
  }
}

async function create(req, res) {
  const { purchase_order_id, vendor_id, bill_reference, bill_date, due_date, lines } = req.body;

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
          account_id: line.account_id || null,
          analytic_account_id: line.analytic_account_id || null,
          quantity: qty,
          unit_price: price,
          tax_amount: tax,
          line_total: lineTotal,
        };
      });

      const totalAmount = subtotal + taxTotal;
      const billNumber = await nextDocumentNumber(client, "B");

      const billRes = await client.query(
        `INSERT INTO vendor_bills (
           bill_number, purchase_order_id, vendor_id, bill_reference, bill_date, due_date,
           status, subtotal, tax_amount, total_amount, amount_paid, amount_due
         )
         VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT', $7, $8, $9, 0, $9)
         RETURNING *`,
        [
          billNumber,
          purchase_order_id || null,
          vendor_id,
          bill_reference || null,
          bill_date || new Date(),
          due_date || null,
          subtotal,
          taxTotal,
          totalAmount,
        ]
      );

      const bill = billRes.rows[0];

      for (const line of processedLines) {
        await client.query(
          `INSERT INTO vendor_bill_lines (vendor_bill_id, product_id, account_id, analytic_account_id, quantity, unit_price, tax_amount, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [bill.id, line.product_id, line.account_id, line.analytic_account_id, line.quantity, line.unit_price, line.tax_amount, line.line_total]
        );
      }

      return bill;
    });

    return res.status(201).json({ data: result });
  } catch (err) {
    console.error("vendorBills.create error", err);
    return res.status(400).json({ message: err.message || "Failed to create vendor bill" });
  }
}

async function confirmBill(req, res) {
  try {
    const result = await withTransaction(async (client) => {
      const billRes = await client.query(
        "SELECT * FROM vendor_bills WHERE id = $1 FOR UPDATE",
        [req.params.id]
      );
      if (billRes.rows.length === 0) {
        throw new Error("Vendor bill not found");
      }
      const bill = billRes.rows[0];
      if (bill.status !== "DRAFT") {
        throw new Error(`Cannot confirm bill with status ${bill.status}`);
      }

      const linesRes = await client.query(
        `SELECT vbl.*, p.product_type 
         FROM vendor_bill_lines vbl
         JOIN products p ON p.id = vbl.product_id
         WHERE vbl.vendor_bill_id = $1`,
        [bill.id]
      );
      const lines = linesRes.rows;

      // 1. Get Accounts
      const expAccRes = await client.query("SELECT id FROM chart_of_accounts WHERE name = 'Purchases Expense' LIMIT 1");
      const credAccRes = await client.query("SELECT id FROM chart_of_accounts WHERE name = 'Creditors' LIMIT 1");
      const journalRes = await client.query("SELECT id FROM journals WHERE journal_type = 'PURCHASE' LIMIT 1");

      const expAccId = expAccRes.rows[0]?.id;
      const credAccId = credAccRes.rows[0]?.id;
      const journalId = journalRes.rows[0]?.id;

      if (!expAccId || !credAccId || !journalId) {
        throw new Error("Missing default Chart of Accounts or Purchase Journal");
      }

      // 2. Create Journal Entry
      const jeNumber = await nextDocumentNumber(client, "JE");
      const jeRes = await client.query(
        `INSERT INTO journal_entries (entry_number, journal_id, entry_date, reference, partner_id, status)
         VALUES ($1, $2, $3, $4, $5, 'POSTED')
         RETURNING id`,
        [jeNumber, journalId, bill.bill_date, `Vendor Bill ${bill.bill_number}`, bill.vendor_id]
      );
      const jeId = jeRes.rows[0].id;

      // Debit Purchases Expense
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, partner_id, debit, credit)
         VALUES ($1, $2, $3, $4, 0)`,
        [jeId, expAccId, bill.vendor_id, bill.subtotal]
      );

      // Debit Tax if any
      if (Number(bill.tax_amount) > 0) {
        const taxAccRes = await client.query("SELECT id FROM chart_of_accounts WHERE name = 'Tax Payable' LIMIT 1");
        const taxAccId = taxAccRes.rows[0]?.id || expAccId;
        await client.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, partner_id, debit, credit)
           VALUES ($1, $2, $3, $4, 0)`,
          [jeId, taxAccId, bill.vendor_id, bill.tax_amount]
        );
      }

      // Credit Creditors
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, partner_id, debit, credit)
         VALUES ($1, $2, $3, 0, $4)`,
        [jeId, credAccId, bill.vendor_id, bill.total_amount]
      );

      // 3. Stock IN for GOODS
      for (const line of lines) {
        if (line.product_type === "GOODS") {
          await client.query(
            `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, movement_date)
             VALUES ($1, 'IN', $2, 'VENDOR_BILL', $3, $4)`,
            [line.product_id, line.quantity, bill.id, bill.bill_date]
          );
        }
      }

      // 4. Update linked PO if exists
      if (bill.purchase_order_id) {
        await client.query(
          "UPDATE purchase_orders SET status = 'BILLED' WHERE id = $1",
          [bill.purchase_order_id]
        );
      }

      // 5. Update Bill status
      const updatedBillRes = await client.query(
        "UPDATE vendor_bills SET status = 'CONFIRMED' WHERE id = $1 RETURNING *",
        [bill.id]
      );

      return updatedBillRes.rows[0];
    });

    return res.json({ data: result });
  } catch (err) {
    console.error("vendorBills.confirmBill error", err);
    return res.status(400).json({ message: err.message || "Failed to confirm vendor bill" });
  }
}

async function cancelBill(req, res) {
  try {
    const result = await query(
      "UPDATE vendor_bills SET status = 'CANCELLED' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Vendor bill not found" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("vendorBills.cancelBill error", err);
    return res.status(500).json({ message: "Failed to cancel vendor bill" });
  }
}

module.exports = { list, getById, create, confirmBill, cancelBill };
