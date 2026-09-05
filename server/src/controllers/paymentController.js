import pool from "../config/db.js";

const VALID_PAYMENT_TYPES = ["RECEIVE", "SEND"];
const VALID_PAYMENT_METHODS = ["CASH", "BANK"];

const generatePaymentNumber = async (client) => {
  const result = await client.query(`
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(payment_number FROM 3) AS INTEGER)),
      0
    ) + 1 AS next_number
    FROM payments
    WHERE payment_number LIKE 'P%'
  `);

  return `P${String(result.rows[0].next_number).padStart(5, "0")}`;
};

const getAccountId = async (client, accountName, accountType) => {
  const result = await client.query(
    `
      SELECT id
      FROM chart_of_accounts
      WHERE name = $1
        AND account_type = $2
        AND is_active = true
      LIMIT 1
    `,
    [accountName, accountType]
  );

  if (result.rows.length === 0) {
    throw new Error(`${accountName} account not found`);
  }

  return result.rows[0].id;
};

// CREATE PAYMENT
export const createPayment = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      paymentType,
      customerInvoiceId,
      vendorBillId,
      amount,
      paymentDate,
      paymentMethod,
      reference,
      note,
    } = req.body;

    if (!VALID_PAYMENT_TYPES.includes(paymentType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment type",
      });
    }

    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than 0",
      });
    }

    if (paymentType === "RECEIVE" && !customerInvoiceId) {
      return res.status(400).json({
        success: false,
        message: "Customer invoice is required for RECEIVE payment",
      });
    }

    if (paymentType === "SEND" && !vendorBillId) {
      return res.status(400).json({
        success: false,
        message: "Vendor bill is required for SEND payment",
      });
    }

    if (customerInvoiceId && vendorBillId) {
      return res.status(400).json({
        success: false,
        message: "Payment cannot be linked to both invoice and vendor bill",
      });
    }

    await client.query("BEGIN");

    let partnerId;
    let amountDue;
    let documentType;
    let documentId;
    let documentNumber;

    // --------------------------------------------------
    // CUSTOMER PAYMENT
    // --------------------------------------------------
    if (paymentType === "RECEIVE") {
      const invoiceResult = await client.query(
        `
          SELECT
            id,
            invoice_number,
            customer_id,
            status,
            total_amount,
            amount_paid,
            amount_due
          FROM customer_invoices
          WHERE id = $1
          FOR UPDATE
        `,
        [customerInvoiceId]
      );

      if (invoiceResult.rows.length === 0) {
        throw new Error("Customer invoice not found");
      }

      const invoice = invoiceResult.rows[0];

      if (!["CONFIRMED", "PARTIALLY_PAID"].includes(invoice.status)) {
        throw new Error(
          "Payment can only be made against a confirmed or partially paid invoice"
        );
      }

      amountDue = Number(invoice.amount_due);

      if (paymentAmount > amountDue) {
        throw new Error(
          `Payment amount cannot exceed amount due of ${amountDue.toFixed(2)}`
        );
      }

      partnerId = invoice.customer_id;
      documentType = "customer_invoice";
      documentId = invoice.id;
      documentNumber = invoice.invoice_number;
    }

    // --------------------------------------------------
    // VENDOR PAYMENT
    // --------------------------------------------------
    if (paymentType === "SEND") {
      const billResult = await client.query(
        `
          SELECT
            id,
            bill_number,
            vendor_id,
            status,
            total_amount,
            amount_paid,
            amount_due
          FROM vendor_bills
          WHERE id = $1
          FOR UPDATE
        `,
        [vendorBillId]
      );

      if (billResult.rows.length === 0) {
        throw new Error("Vendor bill not found");
      }

      const bill = billResult.rows[0];

      if (!["CONFIRMED", "PARTIALLY_PAID"].includes(bill.status)) {
        throw new Error(
          "Payment can only be made against a confirmed or partially paid vendor bill"
        );
      }

      amountDue = Number(bill.amount_due);

      if (paymentAmount > amountDue) {
        throw new Error(
          `Payment amount cannot exceed amount due of ${amountDue.toFixed(2)}`
        );
      }

      partnerId = bill.vendor_id;
      documentType = "vendor_bill";
      documentId = bill.id;
      documentNumber = bill.bill_number;
    }

    // --------------------------------------------------
    // GENERATE PAYMENT NUMBER
    // --------------------------------------------------
    const paymentNumber = await generatePaymentNumber(client);

    // --------------------------------------------------
    // CREATE PAYMENT RECORD
    // --------------------------------------------------
    const paymentResult = await client.query(
      `
        INSERT INTO payments (
          payment_number,
          payment_type,
          partner_id,
          customer_invoice_id,
          vendor_bill_id,
          amount,
          payment_date,
          payment_method,
          reference,
          note,
          status
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          COALESCE($7::date, CURRENT_DATE),
          $8, $9, $10, 'POSTED'
        )
        RETURNING *
      `,
      [
        paymentNumber,
        paymentType,
        partnerId,
        customerInvoiceId || null,
        vendorBillId || null,
        paymentAmount,
        paymentDate || null,
        paymentMethod,
        reference || null,
        note || null,
      ]
    );

    const payment = paymentResult.rows[0];

    // --------------------------------------------------
    // GET REQUIRED ACCOUNTS
    // --------------------------------------------------
    const partnerAccountName =
      paymentType === "RECEIVE" ? "Debtors" : "Creditors";

    const cashBankAccountName =
      paymentMethod === "CASH" ? "Cash" : "Bank";

    const partnerAccountId = await getAccountId(
      client,
      partnerAccountName,
      paymentType === "RECEIVE" ? "ASSET" : "LIABILITY"
    );

    const cashBankAccountId = await getAccountId(
      client,
      cashBankAccountName,
      "ASSET"
    );

    // --------------------------------------------------
    // GET JOURNAL
    // --------------------------------------------------
    const journalType = paymentMethod === "CASH" ? "CASH" : "BANK";

    const journalResult = await client.query(
      `
        SELECT id
        FROM journals
        WHERE journal_type = $1
          AND is_active = true
        LIMIT 1
      `,
      [journalType]
    );

    if (journalResult.rows.length === 0) {
      throw new Error(`${journalType} journal not found`);
    }

    const journalId = journalResult.rows[0].id;

    // --------------------------------------------------
    // CREATE JOURNAL ENTRY
    // --------------------------------------------------
    const journalEntryResult = await client.query(
      `
        INSERT INTO journal_entries (
          journal_id,
          entry_date,
          reference,
          partner_id,
          status
        )
        VALUES (
          $1,
          COALESCE($2::date, CURRENT_DATE),
          $3,
          $4,
          'POSTED'
        )
        RETURNING id
      `,
      [
        journalId,
        paymentDate || null,
        paymentNumber,
        partnerId,
      ]
    );

    const journalEntryId = journalEntryResult.rows[0].id;

    // --------------------------------------------------
    // CUSTOMER RECEIPT
    //
    // Dr Cash/Bank
    // Cr Debtors
    // --------------------------------------------------
    if (paymentType === "RECEIVE") {
      await client.query(
        `
          INSERT INTO journal_entry_lines (
            journal_entry_id,
            account_id,
            partner_id,
            debit,
            credit
          )
          VALUES
            ($1, $2, $3, $4, 0),
            ($1, $5, $3, 0, $4)
        `,
        [
          journalEntryId,
          cashBankAccountId,
          partnerId,
          paymentAmount,
          partnerAccountId,
        ]
      );
    }

    // --------------------------------------------------
    // VENDOR PAYMENT
    //
    // Dr Creditors
    // Cr Cash/Bank
    // --------------------------------------------------
    if (paymentType === "SEND") {
      await client.query(
        `
          INSERT INTO journal_entry_lines (
            journal_entry_id,
            account_id,
            partner_id,
            debit,
            credit
          )
          VALUES
            ($1, $2, $3, $4, 0),
            ($1, $5, $3, 0, $4)
        `,
        [
          journalEntryId,
          partnerAccountId,
          partnerId,
          paymentAmount,
          cashBankAccountId,
        ]
      );
    }

    // --------------------------------------------------
    // UPDATE DOCUMENT PAYMENT STATUS
    // --------------------------------------------------
    let newAmountPaid;
    let newAmountDue;
    let newStatus;

    if (paymentType === "RECEIVE") {
      const invoiceResult = await client.query(
        `
          UPDATE customer_invoices
          SET
            amount_paid = amount_paid + $1,
            amount_due = total_amount - (amount_paid + $1),
            status = CASE
              WHEN total_amount - (amount_paid + $1) <= 0.005
                THEN 'PAID'
              ELSE 'PARTIALLY_PAID'
            END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING amount_paid, amount_due, status
        `,
        [paymentAmount, customerInvoiceId]
      );

      newAmountPaid = invoiceResult.rows[0].amount_paid;
      newAmountDue = invoiceResult.rows[0].amount_due;
      newStatus = invoiceResult.rows[0].status;
    }

    if (paymentType === "SEND") {
      const billResult = await client.query(
        `
          UPDATE vendor_bills
          SET
            amount_paid = amount_paid + $1,
            amount_due = total_amount - (amount_paid + $1),
            status = CASE
              WHEN total_amount - (amount_paid + $1) <= 0.005
                THEN 'PAID'
              ELSE 'PARTIALLY_PAID'
            END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING amount_paid, amount_due, status
        `,
        [paymentAmount, vendorBillId]
      );

      newAmountPaid = billResult.rows[0].amount_paid;
      newAmountDue = billResult.rows[0].amount_due;
      newStatus = billResult.rows[0].status;
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Payment created successfully",
      data: {
        payment,
        documentType,
        documentId,
        documentNumber,
        journalEntryId,
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        documentStatus: newStatus,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Create payment error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};

// GET ALL PAYMENTS
export const getPayments = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.*,
        c.name AS partner_name,
        ci.invoice_number,
        vb.bill_number
      FROM payments p
      LEFT JOIN contacts c
        ON c.id = p.partner_id
      LEFT JOIN customer_invoices ci
        ON ci.id = p.customer_invoice_id
      LEFT JOIN vendor_bills vb
        ON vb.id = p.vendor_bill_id
      ORDER BY p.id DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get payments error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
    });
  }
};

// GET PAYMENT BY ID
export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
        SELECT
          p.*,
          c.name AS partner_name,
          ci.invoice_number,
          vb.bill_number
        FROM payments p
        LEFT JOIN contacts c
          ON c.id = p.partner_id
        LEFT JOIN customer_invoices ci
          ON ci.id = p.customer_invoice_id
        LEFT JOIN vendor_bills vb
          ON vb.id = p.vendor_bill_id
        WHERE p.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get payment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
    });
  }
};