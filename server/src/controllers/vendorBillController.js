import pool from "../config/db.js";

// CREATE VENDOR BILL
export const createVendorBill = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const {
      purchaseOrderId,
      vendorId,
      billReference,
      billDate,
      dueDate,
      lines,
    } = req.body;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    if (!billDate) {
      return res.status(400).json({
        success: false,
        message: "Bill date is required",
      });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one bill line is required",
      });
    }

    await client.query("BEGIN");

    // Validate vendor
    const vendorResult = await client.query(
      `SELECT id
       FROM contacts
       WHERE id = $1
       AND type IN ('VENDOR', 'BOTH')
       AND is_active = TRUE`,
      [vendorId]
    );

    if (vendorResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Vendor not found or contact is not a vendor",
      });
    }

    // If bill comes from PO, validate PO
    if (purchaseOrderId) {
      const poResult = await client.query(
        `SELECT id, vendor_id, status
         FROM purchase_orders
         WHERE id = $1`,
        [purchaseOrderId]
      );

      if (poResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      if (poResult.rows[0].status !== "CONFIRMED") {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Only confirmed purchase orders can create bills",
        });
      }

      if (Number(poResult.rows[0].vendor_id) !== Number(vendorId)) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Bill vendor must match purchase order vendor",
        });
      }
    }

    let subtotal = 0;
    let taxAmount = 0;
    let totalAmount = 0;

    // Validate lines
    for (const line of lines) {
      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unitPrice);
      const tax = Number(line.taxAmount || 0);

      if (!line.productId) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Product is required for every bill line",
        });
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Quantity must be greater than zero",
        });
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Unit price cannot be negative",
        });
      }

      if (!Number.isFinite(tax) || tax < 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Tax amount cannot be negative",
        });
      }

      // Validate product
      const productResult = await client.query(
        `SELECT id
         FROM products
         WHERE id = $1
         AND is_active = TRUE`,
        [line.productId]
      );

      if (productResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: `Product ${line.productId} not found`,
        });
      }

      // Validate account if supplied
      if (line.accountId) {
        const accountResult = await client.query(
          `SELECT id
           FROM chart_of_accounts
           WHERE id = $1
           AND account_type = 'EXPENSE'
           AND is_active = TRUE`,
          [line.accountId]
        );

        if (accountResult.rows.length === 0) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            success: false,
            message: `Expense account ${line.accountId} not found`,
          });
        }
      }

      // Validate analytic account if supplied
      if (line.analyticAccountId) {
        const analyticResult = await client.query(
          `SELECT id
           FROM analytic_accounts
           WHERE id = $1
           AND type = 'EXPENSE'
           AND is_active = TRUE`,
          [line.analyticAccountId]
        );

        if (analyticResult.rows.length === 0) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            success: false,
            message: `Expense analytic account ${line.analyticAccountId} not found`,
          });
        }
      }

      const lineSubtotal = quantity * unitPrice;
      const lineTotal = lineSubtotal + tax;

      subtotal += lineSubtotal;
      taxAmount += tax;
      totalAmount += lineTotal;
    }

    // Generate bill number
    const sequenceResult = await client.query(
      `SELECT COALESCE(
         MAX(
           CAST(
             SUBSTRING(bill_number FROM 2) AS INTEGER
           )
         ),
         0
       ) + 1 AS next_number
       FROM vendor_bills
       WHERE bill_number LIKE 'B%'`
    );

    const nextNumber = sequenceResult.rows[0].next_number;
    const billNumber = `B${String(nextNumber).padStart(5, "0")}`;

    // Create bill
    const billResult = await client.query(
      `INSERT INTO vendor_bills
       (
         bill_number,
         purchase_order_id,
         vendor_id,
         bill_reference,
         bill_date,
         due_date,
         status,
         subtotal,
         tax_amount,
         total_amount,
         amount_paid,
         amount_due
       )
       VALUES
       ($1,$2,$3,$4,$5,$6,'DRAFT',$7,$8,$9,0,$9)
       RETURNING *`,
      [
        billNumber,
        purchaseOrderId || null,
        vendorId,
        billReference || null,
        billDate,
        dueDate || null,
        subtotal.toFixed(2),
        taxAmount.toFixed(2),
        totalAmount.toFixed(2),
      ]
    );

    const bill = billResult.rows[0];

    // Create bill lines
    for (const line of lines) {
      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unitPrice);
      const tax = Number(line.taxAmount || 0);
      const lineTotal = quantity * unitPrice + tax;

      await client.query(
        `INSERT INTO vendor_bill_lines
         (
           vendor_bill_id,
           product_id,
           account_id,
           analytic_account_id,
           quantity,
           unit_price,
           tax_amount,
           line_total
         )
         VALUES
         ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          bill.id,
          line.productId,
          line.accountId || null,
          line.analyticAccountId || null,
          quantity,
          unitPrice,
          tax,
          lineTotal.toFixed(2),
        ]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Vendor bill created successfully",
      data: bill,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

// GET ALL VENDOR BILLS
export const getVendorBills = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         vb.id,
         vb.bill_number,
         vb.purchase_order_id,
         vb.vendor_id,
         c.name AS vendor_name,
         vb.bill_reference,
         vb.bill_date,
         vb.due_date,
         vb.status,
         vb.subtotal,
         vb.tax_amount,
         vb.total_amount,
         vb.amount_paid,
         vb.amount_due,
         vb.created_at,
         vb.updated_at
       FROM vendor_bills vb
       JOIN contacts c
         ON vb.vendor_id = c.id
       ORDER BY vb.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// GET VENDOR BILL BY ID
export const getVendorBillById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const billResult = await pool.query(
      `SELECT
         vb.*,
         c.name AS vendor_name,
         c.email AS vendor_email,
         c.mobile AS vendor_mobile
       FROM vendor_bills vb
       JOIN contacts c
         ON vb.vendor_id = c.id
       WHERE vb.id = $1`,
      [id]
    );

    if (billResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vendor bill not found",
      });
    }

    const linesResult = await pool.query(
      `SELECT
         vbl.*,
         p.name AS product_name,
         coa.name AS account_name,
         aa.name AS analytic_account_name
       FROM vendor_bill_lines vbl
       JOIN products p
         ON vbl.product_id = p.id
       LEFT JOIN chart_of_accounts coa
         ON vbl.account_id = coa.id
       LEFT JOIN analytic_accounts aa
         ON vbl.analytic_account_id = aa.id
       WHERE vbl.vendor_bill_id = $1
       ORDER BY vbl.id`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        ...billResult.rows[0],
        lines: linesResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE DRAFT VENDOR BILL
export const updateVendorBill = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const {
      vendorId,
      purchaseOrderId,
      billReference,
      billDate,
      dueDate,
      lines,
    } = req.body;

    await client.query("BEGIN");

    const existingResult = await client.query(
      `SELECT *
       FROM vendor_bills
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Vendor bill not found",
      });
    }

    if (existingResult.rows[0].status !== "DRAFT") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Only draft vendor bills can be updated",
      });
    }

    if (!vendorId || !billDate) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Vendor and bill date are required",
      });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "At least one bill line is required",
      });
    }

    const vendorResult = await client.query(
      `SELECT id
       FROM contacts
       WHERE id = $1
       AND type IN ('VENDOR', 'BOTH')
       AND is_active = TRUE`,
      [vendorId]
    );

    if (vendorResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Vendor not found or contact is not a vendor",
      });
    }

    if (purchaseOrderId) {
      const poResult = await client.query(
        `SELECT id, vendor_id, status
         FROM purchase_orders
         WHERE id = $1`,
        [purchaseOrderId]
      );

      if (poResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      if (poResult.rows[0].status !== "CONFIRMED") {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Only confirmed purchase orders can be linked",
        });
      }

      if (Number(poResult.rows[0].vendor_id) !== Number(vendorId)) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Bill vendor must match purchase order vendor",
        });
      }
    }

    let subtotal = 0;
    let taxAmount = 0;
    let totalAmount = 0;

    // ---------------------------------------------
// UPDATE STOCK
// ---------------------------------------------
for (const line of linesResult.rows) {
  const productResult = await client.query(
    `
      SELECT product_type
      FROM products
      WHERE id = $1
    `,
    [line.product_id]
  );

  if (
    productResult.rows.length > 0 &&
    productResult.rows[0].product_type === "GOODS"
  ) {
    await client.query(
      `
        INSERT INTO stock_movements (
          product_id,
          movement_type,
          quantity,
          reference_type,
          reference_id,
          movement_date
        )
        VALUES (
          $1,
          'IN',
          $2,
          'VENDOR_BILL',
          $3,
          $4
        )
      `,
      [
        line.product_id,
        line.quantity,
        id,
        invoice.bill_date,
      ]
    );
  }
}

    const updateResult = await client.query(
      `UPDATE vendor_bills
       SET
         purchase_order_id = $1,
         vendor_id = $2,
         bill_reference = $3,
         bill_date = $4,
         due_date = $5,
         subtotal = $6,
         tax_amount = $7,
         total_amount = $8,
         amount_due = $8 - amount_paid
       WHERE id = $9
       RETURNING *`,
      [
        purchaseOrderId || null,
        vendorId,
        billReference || null,
        billDate,
        dueDate || null,
        subtotal.toFixed(2),
        taxAmount.toFixed(2),
        totalAmount.toFixed(2),
        id,
      ]
    );

    await client.query(
      `DELETE FROM vendor_bill_lines
       WHERE vendor_bill_id = $1`,
      [id]
    );

    for (const line of lines) {
      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unitPrice);
      const tax = Number(line.taxAmount || 0);
      const lineTotal = quantity * unitPrice + tax;

      await client.query(
        `INSERT INTO vendor_bill_lines
         (
           vendor_bill_id,
           product_id,
           account_id,
           analytic_account_id,
           quantity,
           unit_price,
           tax_amount,
           line_total
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          id,
          line.productId,
          line.accountId || null,
          line.analyticAccountId || null,
          quantity,
          unitPrice,
          tax,
          lineTotal.toFixed(2),
        ]
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Vendor bill updated successfully",
      data: updateResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

// CONFIRM VENDOR BILL + CREATE JOURNAL ENTRY
export const confirmVendorBill = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    // Lock bill
    const billResult = await client.query(
      `SELECT *
       FROM vendor_bills
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (billResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Vendor bill not found",
      });
    }

    const bill = billResult.rows[0];

    if (bill.status !== "DRAFT") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Only draft vendor bills can be confirmed",
      });
    }

    const linesResult = await client.query(
      `SELECT *
       FROM vendor_bill_lines
       WHERE vendor_bill_id = $1
       ORDER BY id`,
      [id]
    );

    if (linesResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Vendor bill must contain at least one line",
      });
    }

    // Find Purchase Journal
    const journalResult = await client.query(
      `SELECT id
       FROM journals
       WHERE journal_type = 'PURCHASE'
       AND is_active = TRUE
       ORDER BY id
       LIMIT 1`
    );

    if (journalResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Purchase journal is not configured",
      });
    }

    const purchaseJournalId = journalResult.rows[0].id;

    // Find Creditors account
    const creditorResult = await client.query(
      `SELECT id
       FROM chart_of_accounts
       WHERE name = 'Creditors'
       AND account_type = 'LIABILITY'
       AND is_active = TRUE
       LIMIT 1`
    );

    if (creditorResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Creditors account is not configured",
      });
    }

    const creditorAccountId = creditorResult.rows[0].id;

    // Find default purchase expense account
    const purchaseAccountResult = await client.query(
      `SELECT id
       FROM chart_of_accounts
       WHERE name = 'Purchases Expense'
       AND account_type = 'EXPENSE'
       AND is_active = TRUE
       LIMIT 1`
    );

    if (purchaseAccountResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Purchases Expense account is not configured",
      });
    }

    const defaultPurchaseAccountId =
      purchaseAccountResult.rows[0].id;

    // Create journal entry header
    const entryResult = await client.query(
      `INSERT INTO journal_entries
       (
         journal_id,
         entry_date,
         reference,
         partner_id,
         status
       )
       VALUES
       ($1,$2,$3,$4,'POSTED')
       RETURNING *`,
      [
        purchaseJournalId,
        bill.bill_date,
        bill.bill_number,
        bill.vendor_id,
      ]
    );

    const journalEntry = entryResult.rows[0];

    let expenseTotal = 0;

    // Create expense lines
    for (const line of linesResult.rows) {
      const accountId =
        line.account_id || defaultPurchaseAccountId;

      const lineAmount = Number(line.line_total);

      expenseTotal += lineAmount;

      await client.query(
        `INSERT INTO journal_entry_lines
         (
           journal_entry_id,
           account_id,
           partner_id,
           analytic_account_id,
           debit,
           credit
         )
         VALUES
         ($1,$2,$3,$4,$5,0)`,
        [
          journalEntry.id,
          accountId,
          bill.vendor_id,
          line.analytic_account_id || null,
          lineAmount.toFixed(2),
        ]
      );
    }

    // Credit Creditors
    await client.query(
      `INSERT INTO journal_entry_lines
       (
         journal_entry_id,
         account_id,
         partner_id,
         debit,
         credit
       )
       VALUES
       ($1,$2,$3,0,$4)`,
      [
        journalEntry.id,
        creditorAccountId,
        bill.vendor_id,
        expenseTotal.toFixed(2),
      ]
    );

    // Confirm bill
    const updateResult = await client.query(
      `UPDATE vendor_bills
       SET status = 'CONFIRMED'
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Vendor bill confirmed and journal entry created",
      data: {
        bill: updateResult.rows[0],
        journalEntryId: journalEntry.id,
        totalDebit: expenseTotal.toFixed(2),
        totalCredit: expenseTotal.toFixed(2),
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

// CANCEL VENDOR BILL
export const cancelVendorBill = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE vendor_bills
       SET status = 'CANCELLED'
       WHERE id = $1
       AND status = 'DRAFT'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Draft vendor bill not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor bill cancelled successfully",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};