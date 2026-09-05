import pool from "../config/db.js";

const generateInvoiceNumber = async (client) => {
  const result = await client.query(`
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(invoice_number FROM 4) AS INTEGER)),
      0
    ) + 1 AS next_number
    FROM customer_invoices
    WHERE invoice_number LIKE 'INV%'
  `);

  return `INV${String(result.rows[0].next_number).padStart(5, "0")}`;
};

// CREATE CUSTOMER INVOICE
export const createCustomerInvoice = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      salesOrderId,
      customerId,
      invoiceReference,
      invoiceDate,
      dueDate,
      lines,
    } = req.body;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer is required",
      });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one invoice line is required",
      });
    }

    await client.query("BEGIN");

    // ---------------------------------------------
    // VALIDATE CUSTOMER
    // ---------------------------------------------
    const customerResult = await client.query(
      `
        SELECT id, name, type
        FROM contacts
        WHERE id = $1
          AND is_active = true
      `,
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      throw new Error("Customer not found");
    }

    if (!["CUSTOMER", "BOTH"].includes(customerResult.rows[0].type)) {
      throw new Error("Selected contact is not a customer");
    }

    // ---------------------------------------------
    // VALIDATE SALES ORDER IF PROVIDED
    // ---------------------------------------------
    if (salesOrderId) {
      const orderResult = await client.query(
        `
          SELECT id, customer_id, status
          FROM sales_orders
          WHERE id = $1
        `,
        [salesOrderId]
      );

      if (orderResult.rows.length === 0) {
        throw new Error("Sales order not found");
      }

      const order = orderResult.rows[0];

      if (order.customer_id !== Number(customerId)) {
        throw new Error(
          "Sales order customer does not match invoice customer"
        );
      }

      if (order.status !== "CONFIRMED") {
        throw new Error(
          "Customer invoice can only be created from a confirmed sales order"
        );
      }
    }

    let subtotal = 0;
    let taxAmount = 0;

    const processedLines = [];

    // ---------------------------------------------
    // PROCESS INVOICE LINES
    // ---------------------------------------------
    for (const line of lines) {
      const {
        productId,
        accountId,
        analyticAccountId,
        quantity,
        unitPrice,
        taxRate = 0,
      } = line;

      if (!productId) {
        throw new Error("Product is required for every invoice line");
      }

      const qty = Number(quantity);
      const price = Number(unitPrice);
      const tax = Number(taxRate);

      if (!qty || qty <= 0) {
        throw new Error("Quantity must be greater than 0");
      }

      if (price < 0 || Number.isNaN(price)) {
        throw new Error("Unit price must be 0 or greater");
      }

      if (tax < 0 || tax > 100 || Number.isNaN(tax)) {
        throw new Error("Tax rate must be between 0 and 100");
      }

      // ---------------------------------------------
      // VALIDATE PRODUCT
      // ---------------------------------------------
      const productResult = await client.query(
        `
          SELECT id, name, sales_price
          FROM products
          WHERE id = $1
            AND is_active = true
        `,
        [productId]
      );

      if (productResult.rows.length === 0) {
        throw new Error(`Product ${productId} not found`);
      }

      // ---------------------------------------------
      // VALIDATE ACCOUNT IF PROVIDED
      // ---------------------------------------------
      if (accountId) {
        const accountResult = await client.query(
          `
            SELECT id, account_type
            FROM chart_of_accounts
            WHERE id = $1
              AND is_active = true
          `,
          [accountId]
        );

        if (accountResult.rows.length === 0) {
          throw new Error(`Account ${accountId} not found`);
        }

        if (accountResult.rows[0].account_type !== "INCOME") {
          throw new Error(
            `Account ${accountId} must be an INCOME account for sales`
          );
        }
      }

      // ---------------------------------------------
      // VALIDATE ANALYTIC ACCOUNT
      // ---------------------------------------------
      if (analyticAccountId) {
        const analyticResult = await client.query(
          `
            SELECT id, type
            FROM analytic_accounts
            WHERE id = $1
              AND is_active = true
          `,
          [analyticAccountId]
        );

        if (analyticResult.rows.length === 0) {
          throw new Error(
            `Analytic account ${analyticAccountId} not found`
          );
        }

        if (analyticResult.rows[0].type !== "INCOME") {
          throw new Error(
            "Sales analytic account must be an INCOME account"
          );
        }
      }

      const lineSubtotal = qty * price;
      const lineTax = lineSubtotal * (tax / 100);
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      taxAmount += lineTax;

      processedLines.push({
        productId,
        accountId: accountId || null,
        analyticAccountId: analyticAccountId || null,
        quantity: qty,
        unitPrice: price,
        taxRate: tax,
        taxAmount: lineTax,
        lineTotal,
      });
    }

    const totalAmount = subtotal + taxAmount;

    // ---------------------------------------------
    // GENERATE INVOICE NUMBER
    // ---------------------------------------------
    const invoiceNumber = await generateInvoiceNumber(client);

    // ---------------------------------------------
    // CREATE INVOICE
    // ---------------------------------------------
    const invoiceResult = await client.query(
      `
        INSERT INTO customer_invoices (
          invoice_number,
          sales_order_id,
          customer_id,
          invoice_reference,
          invoice_date,
          due_date,
          status,
          subtotal,
          tax_amount,
          total_amount,
          amount_paid,
          amount_due
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          COALESCE($5::date, CURRENT_DATE),
          $6,
          'DRAFT',
          $7,
          $8,
          $9,
          0,
          $9
        )
        RETURNING *
      `,
      [
        invoiceNumber,
        salesOrderId || null,
        customerId,
        invoiceReference || null,
        invoiceDate || null,
        dueDate || null,
        subtotal.toFixed(2),
        taxAmount.toFixed(2),
        totalAmount.toFixed(2),
      ]
    );

    const invoice = invoiceResult.rows[0];

    // ---------------------------------------------
    // CREATE INVOICE LINES
    // ---------------------------------------------
    for (const line of processedLines) {
      await client.query(
        `
          INSERT INTO customer_invoice_lines (
            invoice_id,
            product_id,
            account_id,
            analytic_account_id,
            quantity,
            unit_price,
            tax_rate,
            tax_amount,
            line_total
          )
          VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9
          )
        `,
        [
          invoice.id,
          line.productId,
          line.accountId,
          line.analyticAccountId,
          line.quantity,
          line.unitPrice,
          line.taxRate,
          line.taxAmount.toFixed(2),
          line.lineTotal.toFixed(2),
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Customer invoice created successfully",
      data: invoice,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Create customer invoice error:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};

// GET ALL INVOICES
export const getCustomerInvoices = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ci.*,
        c.name AS customer_name,
        so.so_number
      FROM customer_invoices ci
      LEFT JOIN contacts c
        ON c.id = ci.customer_id
      LEFT JOIN sales_orders so
        ON so.id = ci.sales_order_id
      ORDER BY ci.id DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get customer invoices error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer invoices",
    });
  }
};

// GET INVOICE BY ID
export const getCustomerInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoiceResult = await pool.query(
      `
        SELECT
          ci.*,
          c.name AS customer_name,
          c.email AS customer_email,
          c.mobile AS customer_mobile,
          so.so_number
        FROM customer_invoices ci
        LEFT JOIN contacts c
          ON c.id = ci.customer_id
        LEFT JOIN sales_orders so
          ON so.id = ci.sales_order_id
        WHERE ci.id = $1
      `,
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer invoice not found",
      });
    }

    const linesResult = await pool.query(
      `
        SELECT
          cil.*,
          p.name AS product_name,
          coa.name AS account_name,
          aa.name AS analytic_account_name
        FROM customer_invoice_lines cil
        LEFT JOIN products p
          ON p.id = cil.product_id
        LEFT JOIN chart_of_accounts coa
          ON coa.id = cil.account_id
        LEFT JOIN analytic_accounts aa
          ON aa.id = cil.analytic_account_id
        WHERE cil.invoice_id = $1
        ORDER BY cil.id
      `,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...invoiceResult.rows[0],
        lines: linesResult.rows,
      },
    });
  } catch (error) {
    console.error("Get customer invoice error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer invoice",
    });
  }
};

// UPDATE DRAFT INVOICE
export const updateCustomerInvoice = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const {
      customerId,
      invoiceReference,
      invoiceDate,
      dueDate,
      lines,
    } = req.body;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer is required",
      });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one invoice line is required",
      });
    }

    await client.query("BEGIN");

    const existingResult = await client.query(
      `
        SELECT *
        FROM customer_invoices
        WHERE id = $1
        FOR UPDATE
      `,
      [id]
    );

    if (existingResult.rows.length === 0) {
      throw new Error("Customer invoice not found");
    }

    const existingInvoice = existingResult.rows[0];

    if (existingInvoice.status !== "DRAFT") {
      throw new Error("Only draft invoices can be updated");
    }

    // Validate customer
    const customerResult = await client.query(
      `
        SELECT id, type
        FROM contacts
        WHERE id = $1
          AND is_active = true
      `,
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      throw new Error("Customer not found");
    }

    if (!["CUSTOMER", "BOTH"].includes(customerResult.rows[0].type)) {
      throw new Error("Selected contact is not a customer");
    }

    let subtotal = 0;
    let taxAmount = 0;
    const processedLines = [];

    for (const line of lines) {
      const {
        productId,
        accountId,
        analyticAccountId,
        quantity,
        unitPrice,
        taxRate = 0,
      } = line;

      const qty = Number(quantity);
      const price = Number(unitPrice);
      const tax = Number(taxRate);

      if (!productId) {
        throw new Error("Product is required for every invoice line");
      }

      if (!qty || qty <= 0) {
        throw new Error("Quantity must be greater than 0");
      }

      if (price < 0 || Number.isNaN(price)) {
        throw new Error("Unit price must be 0 or greater");
      }

      if (tax < 0 || tax > 100 || Number.isNaN(tax)) {
        throw new Error("Tax rate must be between 0 and 100");
      }

      const productResult = await client.query(
        `
          SELECT id
          FROM products
          WHERE id = $1
            AND is_active = true
        `,
        [productId]
      );

      if (productResult.rows.length === 0) {
        throw new Error(`Product ${productId} not found`);
      }

      if (accountId) {
        const accountResult = await client.query(
          `
            SELECT id, account_type
            FROM chart_of_accounts
            WHERE id = $1
              AND is_active = true
          `,
          [accountId]
        );

        if (accountResult.rows.length === 0) {
          throw new Error(`Account ${accountId} not found`);
        }

        if (accountResult.rows[0].account_type !== "INCOME") {
          throw new Error(
            "Invoice account must be an INCOME account"
          );
        }
      }

      if (analyticAccountId) {
        const analyticResult = await client.query(
          `
            SELECT id, type
            FROM analytic_accounts
            WHERE id = $1
              AND is_active = true
          `,
          [analyticAccountId]
        );

        if (analyticResult.rows.length === 0) {
          throw new Error(
            `Analytic account ${analyticAccountId} not found`
          );
        }

        if (analyticResult.rows[0].type !== "INCOME") {
          throw new Error(
            "Invoice analytic account must be an INCOME account"
          );
        }
      }

      const lineSubtotal = qty * price;
      const lineTax = lineSubtotal * (tax / 100);
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      taxAmount += lineTax;

      processedLines.push({
        productId,
        accountId: accountId || null,
        analyticAccountId: analyticAccountId || null,
        quantity: qty,
        unitPrice: price,
        taxRate: tax,
        taxAmount: lineTax,
        lineTotal,
      });
    }

    const totalAmount = subtotal + taxAmount;

    await client.query(
      `
        UPDATE customer_invoices
        SET
          customer_id = $1,
          invoice_reference = $2,
          invoice_date = COALESCE($3::date, invoice_date),
          due_date = $4,
          subtotal = $5,
          tax_amount = $6,
          total_amount = $7,
          amount_due = $7 - amount_paid,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
      `,
      [
        customerId,
        invoiceReference || null,
        invoiceDate || null,
        dueDate || null,
        subtotal.toFixed(2),
        taxAmount.toFixed(2),
        totalAmount.toFixed(2),
        id,
      ]
    );

    await client.query(
      `DELETE FROM customer_invoice_lines WHERE invoice_id = $1`,
      [id]
    );

    for (const line of processedLines) {
      await client.query(
        `
          INSERT INTO customer_invoice_lines (
            invoice_id,
            product_id,
            account_id,
            analytic_account_id,
            quantity,
            unit_price,
            tax_rate,
            tax_amount,
            line_total
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [
          id,
          line.productId,
          line.accountId,
          line.analyticAccountId,
          line.quantity,
          line.unitPrice,
          line.taxRate,
          line.taxAmount.toFixed(2),
          line.lineTotal.toFixed(2),
        ]
      );
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Customer invoice updated successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Update customer invoice error:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};

// CONFIRM INVOICE + AUTOMATIC JOURNAL ENTRY
export const confirmCustomerInvoice = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    const invoiceResult = await client.query(
      `
        SELECT *
        FROM customer_invoices
        WHERE id = $1
        FOR UPDATE
      `,
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      throw new Error("Customer invoice not found");
    }

    const invoice = invoiceResult.rows[0];

    if (invoice.status !== "DRAFT") {
      throw new Error("Only draft invoices can be confirmed");
    }

    // ---------------------------------------------
    // GET INVOICE LINES
    // ---------------------------------------------
    const linesResult = await client.query(
      `
        SELECT *
        FROM customer_invoice_lines
        WHERE invoice_id = $1
        ORDER BY id
      `,
      [id]
    );

    if (linesResult.rows.length === 0) {
      throw new Error("Invoice must contain at least one line");
    }

    // ---------------------------------------------
    // FIND SALES JOURNAL
    // ---------------------------------------------
    const journalResult = await client.query(
      `
        SELECT id
        FROM journals
        WHERE journal_type = 'SALES'
          AND is_active = true
        LIMIT 1
      `
    );

    if (journalResult.rows.length === 0) {
      throw new Error("Sales journal not found");
    }

    const journalId = journalResult.rows[0].id;

    // ---------------------------------------------
    // FIND DEBTORS ACCOUNT
    // ---------------------------------------------
    const debtorResult = await client.query(
      `
        SELECT id
        FROM chart_of_accounts
        WHERE name = 'Debtors'
          AND account_type = 'ASSET'
          AND is_active = true
        LIMIT 1
      `
    );

    if (debtorResult.rows.length === 0) {
      throw new Error("Debtors account not found");
    }

    const debtorAccountId = debtorResult.rows[0].id;

    // ---------------------------------------------
    // FIND DEFAULT SALES ACCOUNT
    // ---------------------------------------------
    const salesResult = await client.query(
      `
        SELECT id
        FROM chart_of_accounts
        WHERE name = 'Sales Income'
          AND account_type = 'INCOME'
          AND is_active = true
        LIMIT 1
      `
    );

    if (salesResult.rows.length === 0) {
      throw new Error("Sales Income account not found");
    }

    const defaultSalesAccountId = salesResult.rows[0].id;

    // ---------------------------------------------
    // CREATE JOURNAL ENTRY
    // ---------------------------------------------
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
          $2,
          $3,
          $4,
          'POSTED'
        )
        RETURNING id
      `,
      [
        journalId,
        invoice.invoice_date,
        invoice.invoice_number,
        invoice.customer_id,
      ]
    );

    const journalEntryId = journalEntryResult.rows[0].id;

    // ---------------------------------------------
    // DEBIT DEBTORS
    // ---------------------------------------------
    await client.query(
      `
        INSERT INTO journal_entry_lines (
          journal_entry_id,
          account_id,
          partner_id,
          debit,
          credit
        )
        VALUES ($1, $2, $3, $4, 0)
      `,
      [
        journalEntryId,
        debtorAccountId,
        invoice.customer_id,
        invoice.total_amount,
      ]
    );

    // ---------------------------------------------
    // CREDIT SALES
    // ---------------------------------------------
    for (const line of linesResult.rows) {
      const salesAccountId =
        line.account_id || defaultSalesAccountId;

      await client.query(
        `
          INSERT INTO journal_entry_lines (
            journal_entry_id,
            account_id,
            partner_id,
            analytic_account_id,
            debit,
            credit
          )
          VALUES ($1, $2, $3, $4, 0, $5)
        `,
        [
          journalEntryId,
          salesAccountId,
          invoice.customer_id,
          line.analytic_account_id,
          line.line_total,
        ]
      );
    }

    // ---------------------------------------------
    // UPDATE INVOICE
    // ---------------------------------------------
    const updatedInvoiceResult = await client.query(
      `
        UPDATE customer_invoices
        SET
          status = 'CONFIRMED',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `,
      [id]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Customer invoice confirmed successfully",
      data: {
        invoice: updatedInvoiceResult.rows[0],
        journalEntryId,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Confirm customer invoice error:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};

// CANCEL DRAFT INVOICE
export const cancelCustomerInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
        UPDATE customer_invoices
        SET
          status = 'CANCELLED',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND status = 'DRAFT'
        RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Only draft invoices can be cancelled",
      });
    }

    res.json({
      success: true,
      message: "Customer invoice cancelled successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Cancel customer invoice error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel customer invoice",
    });
  }
};