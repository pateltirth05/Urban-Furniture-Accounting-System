import pool from "../config/db.js";

// CREATE PURCHASE ORDER
export const createPurchaseOrder = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const {
      vendorId,
      poDate,
      paymentTerms,
      lines,
    } = req.body;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    if (!poDate) {
      return res.status(400).json({
        success: false,
        message: "Purchase order date is required",
      });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one purchase order line is required",
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

    let subtotal = 0;
    let taxAmount = 0;
    let totalAmount = 0;

    // Validate lines
    for (const line of lines) {
      const {
        productId,
        analyticAccountId,
        quantity,
        unitPrice,
        taxAmount: lineTaxAmount,
      } = line;

      if (!productId) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Product is required for every purchase order line",
        });
      }

      const qty = Number(quantity);
      const price = Number(unitPrice);
      const tax = Number(lineTaxAmount || 0);

      if (!Number.isFinite(qty) || qty <= 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Quantity must be greater than zero",
        });
      }

      if (!Number.isFinite(price) || price < 0) {
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
        [productId]
      );

      if (productResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: `Product ${productId} not found`,
        });
      }

      // Validate analytic account if supplied
      if (analyticAccountId) {
        const analyticResult = await client.query(
          `SELECT id
           FROM analytic_accounts
           WHERE id = $1
           AND type = 'EXPENSE'
           AND is_active = TRUE`,
          [analyticAccountId]
        );

        if (analyticResult.rows.length === 0) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            success: false,
            message: `Expense analytic account ${analyticAccountId} not found`,
          });
        }
      }

      const lineSubtotal = qty * price;
      const lineTotal = lineSubtotal + tax;

      subtotal += lineSubtotal;
      taxAmount += tax;
      totalAmount += lineTotal;
    }

    // Generate PO number
    const sequenceResult = await client.query(
      `SELECT COALESCE(
         MAX(
           CAST(
             SUBSTRING(po_number FROM 2) AS INTEGER
           )
         ),
         0
       ) + 1 AS next_number
       FROM purchase_orders
       WHERE po_number LIKE 'P%'`
    );

    const nextNumber = sequenceResult.rows[0].next_number;
    const poNumber = `P${String(nextNumber).padStart(5, "0")}`;

    // Create PO header
    const poResult = await client.query(
      `INSERT INTO purchase_orders
       (
         po_number,
         vendor_id,
         po_date,
         payment_terms,
         status,
         subtotal,
         tax_amount,
         total_amount
       )
       VALUES
       ($1, $2, $3, $4, 'DRAFT', $5, $6, $7)
       RETURNING *`,
      [
        poNumber,
        vendorId,
        poDate,
        paymentTerms || null,
        subtotal.toFixed(2),
        taxAmount.toFixed(2),
        totalAmount.toFixed(2),
      ]
    );

    const purchaseOrder = poResult.rows[0];

    // Create PO lines
    for (const line of lines) {
      const qty = Number(line.quantity);
      const price = Number(line.unitPrice);
      const tax = Number(line.taxAmount || 0);

      const lineTotal = qty * price + tax;

      await client.query(
        `INSERT INTO purchase_order_lines
         (
           purchase_order_id,
           product_id,
           analytic_account_id,
           quantity,
           unit_price,
           tax_amount,
           line_total
         )
         VALUES
         ($1, $2, $3, $4, $5, $6, $7)`,
        [
          purchaseOrder.id,
          line.productId,
          line.analyticAccountId || null,
          qty,
          price,
          tax,
          lineTotal.toFixed(2),
        ]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Purchase order created successfully",
      data: purchaseOrder,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

// GET ALL PURCHASE ORDERS
export const getPurchaseOrders = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         po.id,
         po.po_number,
         po.vendor_id,
         c.name AS vendor_name,
         po.po_date,
         po.payment_terms,
         po.status,
         po.subtotal,
         po.tax_amount,
         po.total_amount,
         po.created_at,
         po.updated_at
       FROM purchase_orders po
       JOIN contacts c
         ON po.vendor_id = c.id
       ORDER BY po.created_at DESC`
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

// GET PURCHASE ORDER BY ID
export const getPurchaseOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const poResult = await pool.query(
      `SELECT
         po.*,
         c.name AS vendor_name,
         c.email AS vendor_email,
         c.mobile AS vendor_mobile
       FROM purchase_orders po
       JOIN contacts c
         ON po.vendor_id = c.id
       WHERE po.id = $1`,
      [id]
    );

    if (poResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    const linesResult = await pool.query(
      `SELECT
         pol.*,
         p.name AS product_name,
         aa.name AS analytic_account_name
       FROM purchase_order_lines pol
       JOIN products p
         ON pol.product_id = p.id
       LEFT JOIN analytic_accounts aa
         ON pol.analytic_account_id = aa.id
       WHERE pol.purchase_order_id = $1
       ORDER BY pol.id`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        ...poResult.rows[0],
        lines: linesResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE PURCHASE ORDER
export const updatePurchaseOrder = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const {
      vendorId,
      poDate,
      paymentTerms,
      lines,
    } = req.body;

    await client.query("BEGIN");

    // Only draft POs can be edited
    const existingResult = await client.query(
      `SELECT *
       FROM purchase_orders
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    if (existingResult.rows[0].status !== "DRAFT") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Only draft purchase orders can be updated",
      });
    }

    if (!vendorId || !poDate) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Vendor and purchase order date are required",
      });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "At least one purchase order line is required",
      });
    }

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

    let subtotal = 0;
    let taxAmount = 0;
    let totalAmount = 0;

    for (const line of lines) {
      const qty = Number(line.quantity);
      const price = Number(line.unitPrice);
      const tax = Number(line.taxAmount || 0);

      if (!line.productId) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Product is required for every line",
        });
      }

      if (!Number.isFinite(qty) || qty <= 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Quantity must be greater than zero",
        });
      }

      if (!Number.isFinite(price) || price < 0) {
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

      const lineSubtotal = qty * price;
      const lineTotal = lineSubtotal + tax;

      subtotal += lineSubtotal;
      taxAmount += tax;
      totalAmount += lineTotal;
    }

    // Update header
    const updateResult = await client.query(
      `UPDATE purchase_orders
       SET
         vendor_id = $1,
         po_date = $2,
         payment_terms = $3,
         subtotal = $4,
         tax_amount = $5,
         total_amount = $6
       WHERE id = $7
       RETURNING *`,
      [
        vendorId,
        poDate,
        paymentTerms || null,
        subtotal.toFixed(2),
        taxAmount.toFixed(2),
        totalAmount.toFixed(2),
        id,
      ]
    );

    // Replace lines
    await client.query(
      `DELETE FROM purchase_order_lines
       WHERE purchase_order_id = $1`,
      [id]
    );

    for (const line of lines) {
      const qty = Number(line.quantity);
      const price = Number(line.unitPrice);
      const tax = Number(line.taxAmount || 0);
      const lineTotal = qty * price + tax;

      await client.query(
        `INSERT INTO purchase_order_lines
         (
           purchase_order_id,
           product_id,
           analytic_account_id,
           quantity,
           unit_price,
           tax_amount,
           line_total
         )
         VALUES
         ($1,$2,$3,$4,$5,$6,$7)`,
        [
          id,
          line.productId,
          line.analyticAccountId || null,
          qty,
          price,
          tax,
          lineTotal.toFixed(2),
        ]
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Purchase order updated successfully",
      data: updateResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

// CONFIRM PURCHASE ORDER
export const confirmPurchaseOrder = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    const result = await client.query(
      `SELECT *
       FROM purchase_orders
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    const purchaseOrder = result.rows[0];

    if (purchaseOrder.status !== "DRAFT") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Only draft purchase orders can be confirmed",
      });
    }

    const linesResult = await client.query(
      `SELECT *
       FROM purchase_order_lines
       WHERE purchase_order_id = $1`,
      [id]
    );

    if (linesResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Purchase order must contain at least one line",
      });
    }

    const updateResult = await client.query(
      `UPDATE purchase_orders
       SET status = 'CONFIRMED'
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Purchase order confirmed successfully",
      data: updateResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

// CANCEL PURCHASE ORDER
export const cancelPurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE purchase_orders
       SET status = 'CANCELLED'
       WHERE id = $1
       AND status = 'DRAFT'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Draft purchase order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Purchase order cancelled successfully",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};