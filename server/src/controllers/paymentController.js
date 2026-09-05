const { query, withTransaction } = require("../config/db");
const { nextDocumentNumber } = require("../utils/documentNumber");

async function list(req, res) {
  const { page = 1, pageSize = 20, search = "", payment_type, partner_id } = req.query;
  const limit = Math.min(Number(pageSize) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.payment_number ILIKE $${params.length} OR p.reference ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }
  if (payment_type) {
    params.push(payment_type);
    conditions.push(`p.payment_type = $${params.length}`);
  }
  if (partner_id) {
    params.push(partner_id);
    conditions.push(`p.partner_id = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const countResult = await query(
      `SELECT COUNT(*)::int AS total 
       FROM payments p
       JOIN contacts c ON c.id = p.partner_id
       ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const rowsResult = await query(
      `SELECT p.*, c.name AS partner_name,
              ci.invoice_number, vb.bill_number
       FROM payments p
       JOIN contacts c ON c.id = p.partner_id
       LEFT JOIN customer_invoices ci ON ci.id = p.customer_invoice_id
       LEFT JOIN vendor_bills vb ON vb.id = p.vendor_bill_id
       ${whereClause}
       ORDER BY p.payment_date DESC, p.id DESC
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
    console.error("payments.list error", err);
    return res.status(500).json({ message: "Failed to list payments" });
  }
}

async function getById(req, res) {
  try {
    const result = await query(
      `SELECT p.*, c.name AS partner_name, ci.invoice_number, vb.bill_number
       FROM payments p
       JOIN contacts c ON c.id = p.partner_id
       LEFT JOIN customer_invoices ci ON ci.id = p.customer_invoice_id
       LEFT JOIN vendor_bills vb ON vb.id = p.vendor_bill_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("payments.getById error", err);
    return res.status(500).json({ message: "Failed to load payment" });
  }
}

async function create(req, res) {
  const {
    payment_type,
    partner_id,
    customer_invoice_id,
    vendor_bill_id,
    amount,
    payment_date,
    payment_method,
    reference,
    note,
  } = req.body;

  const paymentAmount = Number(amount) || 0;
  if (!payment_type || !partner_id || paymentAmount <= 0 || !payment_method) {
    return res.status(400).json({ message: "payment_type, partner_id, amount > 0, and payment_method are required" });
  }

  if ((!customer_invoice_id && !vendor_bill_id) || (customer_invoice_id && vendor_bill_id)) {
    return res.status(400).json({ message: "Must specify exactly one of customer_invoice_id or vendor_bill_id" });
  }

  try {
    const result = await withTransaction(async (client) => {
      let targetDocNumber = "";

      if (customer_invoice_id) {
        const invRes = await client.query(
          "SELECT * FROM customer_invoices WHERE id = $1 FOR UPDATE",
          [customer_invoice_id]
        );
        if (invRes.rows.length === 0) throw new Error("Customer invoice not found");
        const inv = invRes.rows[0];
        targetDocNumber = inv.invoice_number;

        if (paymentAmount > Number(inv.amount_due) + 0.01) {
          throw new Error(`Payment amount (${paymentAmount}) exceeds invoice amount due (${inv.amount_due})`);
        }

        const newPaid = Number(inv.amount_paid) + paymentAmount;
        const newDue = Math.max(0, Number(inv.total_amount) - newPaid);
        const newStatus = newDue <= 0.01 ? "PAID" : "PARTIALLY_PAID";

        await client.query(
          "UPDATE customer_invoices SET amount_paid = $1, amount_due = $2, status = $3 WHERE id = $4",
          [newPaid, newDue, newStatus, inv.id]
        );

        // Accounting: Dr Cash/Bank, Cr Debtors
        const bankAccName = payment_method === "CASH" ? "Cash" : "Bank";
        const bankAccRes = await client.query("SELECT id FROM chart_of_accounts WHERE name = $1 LIMIT 1", [bankAccName]);
        const debtAccRes = await client.query("SELECT id FROM chart_of_accounts WHERE name = 'Debtors' LIMIT 1");
        const journalType = payment_method === "CASH" ? "CASH" : "BANK";
        const journalRes = await client.query("SELECT id FROM journals WHERE journal_type = $1 LIMIT 1", [journalType]);

        const jeNumber = await nextDocumentNumber(client, "JE");
        const jeRes = await client.query(
          `INSERT INTO journal_entries (entry_number, journal_id, entry_date, reference, partner_id, status)
           VALUES ($1, $2, $3, $4, $5, 'POSTED')
           RETURNING id`,
          [jeNumber, journalRes.rows[0].id, payment_date || new Date(), `Payment for Invoice ${inv.invoice_number}`, partner_id]
        );
        const jeId = jeRes.rows[0].id;

        await client.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, partner_id, debit, credit)
           VALUES ($1, $2, $3, $4, 0)`,
          [jeId, bankAccRes.rows[0].id, partner_id, paymentAmount]
        );
        await client.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, partner_id, debit, credit)
           VALUES ($1, $2, $3, 0, $4)`,
          [jeId, debtAccRes.rows[0].id, partner_id, paymentAmount]
        );
      } else if (vendor_bill_id) {
        const billRes = await client.query(
          "SELECT * FROM vendor_bills WHERE id = $1 FOR UPDATE",
          [vendor_bill_id]
        );
        if (billRes.rows.length === 0) throw new Error("Vendor bill not found");
        const bill = billRes.rows[0];
        targetDocNumber = bill.bill_number;

        if (paymentAmount > Number(bill.amount_due) + 0.01) {
          throw new Error(`Payment amount (${paymentAmount}) exceeds bill amount due (${bill.amount_due})`);
        }

        const newPaid = Number(bill.amount_paid) + paymentAmount;
        const newDue = Math.max(0, Number(bill.total_amount) - newPaid);
        const newStatus = newDue <= 0.01 ? "PAID" : "PARTIALLY_PAID";

        await client.query(
          "UPDATE vendor_bills SET amount_paid = $1, amount_due = $2, status = $3 WHERE id = $4",
          [newPaid, newDue, newStatus, bill.id]
        );

        // Accounting: Dr Creditors, Cr Cash/Bank
        const bankAccName = payment_method === "CASH" ? "Cash" : "Bank";
        const bankAccRes = await client.query("SELECT id FROM chart_of_accounts WHERE name = $1 LIMIT 1", [bankAccName]);
        const credAccRes = await client.query("SELECT id FROM chart_of_accounts WHERE name = 'Creditors' LIMIT 1");
        const journalType = payment_method === "CASH" ? "CASH" : "BANK";
        const journalRes = await client.query("SELECT id FROM journals WHERE journal_type = $1 LIMIT 1", [journalType]);

        const jeNumber = await nextDocumentNumber(client, "JE");
        const jeRes = await client.query(
          `INSERT INTO journal_entries (entry_number, journal_id, entry_date, reference, partner_id, status)
           VALUES ($1, $2, $3, $4, $5, 'POSTED')
           RETURNING id`,
          [jeNumber, journalRes.rows[0].id, payment_date || new Date(), `Payment for Bill ${bill.bill_number}`, partner_id]
        );
        const jeId = jeRes.rows[0].id;

        await client.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, partner_id, debit, credit)
           VALUES ($1, $2, $3, $4, 0)`,
          [jeId, credAccRes.rows[0].id, partner_id, paymentAmount]
        );
        await client.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, partner_id, debit, credit)
           VALUES ($1, $2, $3, 0, $4)`,
          [jeId, bankAccRes.rows[0].id, partner_id, paymentAmount]
        );
      }

      const pmtNumber = await nextDocumentNumber(client, "PMT");
      const pmtRes = await client.query(
        `INSERT INTO payments (
           payment_number, payment_type, partner_id, customer_invoice_id, vendor_bill_id,
           amount, payment_date, payment_method, reference, note, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'CONFIRMED')
         RETURNING *`,
        [
          pmtNumber,
          payment_type,
          partner_id,
          customer_invoice_id || null,
          vendor_bill_id || null,
          paymentAmount,
          payment_date || new Date(),
          payment_method,
          reference || targetDocNumber || null,
          note || null,
        ]
      );

      return pmtRes.rows[0];
    });

    return res.status(201).json({ data: result });
  } catch (err) {
    console.error("payments.create error", err);
    return res.status(400).json({ message: err.message || "Failed to record payment" });
  }
}

module.exports = { list, getById, create };
