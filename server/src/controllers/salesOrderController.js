import pool from "../config/db.js";

const VALID_STATUSES = ["DRAFT", "CONFIRMED", "CANCELLED", "CLOSED"];

const generateSalesOrderNumber = async (client) => {
  const result = await client.query(`
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(so_number FROM 3) AS INTEGER)),
      0
    ) + 1 AS next_number
    FROM sales_orders
    WHERE so_number LIKE 'SO%'
  `);

  return `SO${String(result.rows[0].next_number).padStart(5, "0")}`;
};

// CREATE SALES ORDER
export const createSalesOrder = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      customerId,
      soDate,
      paymentTerms,
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
        message: "At least one sales order line is required",
      });
    }

    await client.query("BEGIN");

    // Validate customer
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

    const customer = customerResult.rows[0];

    if (!["CUSTOMER", "BOTH"].includes(customer.type)) {
      throw new Error("Selected contact is not a customer");
    }

    let subtotal = 0;
    let taxAmount = 0;
    const processedLines = [];

    for (const line of lines) {
      const {
        productId,
        analyticAccountId,
        quantity,
        unitPrice,
        taxRate = 0,
      } = line;

      if (!productId) {
        throw new Error("Product is required for every line");
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

      // Validate product
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

      // Validate analytic account if supplied
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
            `Analytic account ${analyticAccountId} must be an INCOME account for sales`
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
        analyticAccountId: analyticAccountId || null,
        quantity: qty,
        unitPrice: price,
        taxRate: tax,
        taxAmount: lineTax,
        lineTotal,
      });
    }

    const totalAmount = subtotal + taxAmount;

    const soNumber = await generateSalesOrderNumber(client);

    const orderResult = await client.query(
      `
        INSERT INTO sales_orders (
          so_number,
          customer_id,
          so_date,
          payment_terms,
          status,
          subtotal,
          tax_amount,
          total_amount
        )
        VALUES (
          $1,
          $2,
          COALESCE($3::date, CURRENT_DATE),
          $4,
          'DRAFT',
          $5,
          $6,
          $7
        )
        RETURNING *
      `,
      [
        soNumber,
        customerId,
        soDate || null,
        paymentTerms || null,
        subtotal.toFixed(2),
        taxAmount.toFixed(2),
        totalAmount.toFixed(2),
      ]
    );

    const salesOrder = soNumber ? soNumber : null;

    const salesOrderId = orderResult.rows[0].id;

    for (const line of processedLines) {
      await client.query(
        `
          INSERT INTO sales_order_lines (
            sales_order_id,
            product_id,
            analytic_account_id,
            quantity,
            unit_price,
            tax_rate,
            tax_amount,
            line_total
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          salesOrderId,
          line.productId,
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

    return res.status(201).json({
      success: true,
      message: "Sales order created successfully",
      data: orderResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Create sales order error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};

// GET ALL SALES ORDERS
export const getSalesOrders = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        so.*,
        c.name AS customer_name
      FROM sales_orders so
      LEFT JOIN contacts c
        ON c.id = so.customer_id
      ORDER BY so.id DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get sales orders error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch sales orders",
    });
  }
};

// GET SALES ORDER BY ID
export const getSalesOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const orderResult = await pool.query(
      `
        SELECT
          so.*,
          c.name AS customer_name,
          c.email AS customer_email,
          c.mobile AS customer_mobile
        FROM sales_orders so
        LEFT JOIN contacts c
          ON c.id = so.customer_id
        WHERE so.id = $1
      `,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sales order not found",
      });
    }

    const linesResult = await pool.query(
      `
        SELECT
          sol.*,
          p.name AS product_name,
          aa.name AS analytic_account_name
        FROM sales_order_lines sol
        LEFT JOIN products p
          ON p.id = sol.product_id
        LEFT JOIN analytic_accounts aa
          ON aa.id = sol.analytic_account_id
        WHERE sol.sales_order_id = $1
        ORDER BY sol.id
      `,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...orderResult.rows[0],
        lines: linesResult.rows,
      },
    });
  } catch (error) {
    console.error("Get sales order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch sales order",
    });
  }
};

// UPDATE DRAFT SALES ORDER
export const updateSalesOrder = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const {
      customerId,
      soDate,
      paymentTerms,
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
        message: "At least one sales order line is required",
      });
    }

    await client.query("BEGIN");

    const existingResult = await client.query(
      `
        SELECT *
        FROM sales_orders
        WHERE id = $1
        FOR UPDATE
      `,
      [id]
    );

    if (existingResult.rows.length === 0) {
      throw new Error("Sales order not found");
    }

    if (existingResult.rows[0].status !== "DRAFT") {
      throw new Error("Only draft sales orders can be updated");
    }

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
        analyticAccountId,
        quantity,
        unitPrice,
        taxRate = 0,
      } = line;

      const qty = Number(quantity);
      const price = Number(unitPrice);
      const tax = Number(taxRate);

      if (!productId) {
        throw new Error("Product is required for every line");
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
        UPDATE sales_orders
        SET
          customer_id = $1,
          so_date = COALESCE($2::date, so_date),
          payment_terms = $3,
          subtotal = $4,
          tax_amount = $5,
          total_amount = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
      `,
      [
        customerId,
        soDate || null,
        paymentTerms || null,
        subtotal.toFixed(2),
        taxAmount.toFixed(2),
        totalAmount.toFixed(2),
        id,
      ]
    );

    await client.query(
      `DELETE FROM sales_order_lines WHERE sales_order_id = $1`,
      [id]
    );

    for (const line of processedLines) {
      await client.query(
        `
          INSERT INTO sales_order_lines (
            sales_order_id,
            product_id,
            analytic_account_id,
            quantity,
            unit_price,
            tax_rate,
            tax_amount,
            line_total
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          id,
          line.productId,
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
      message: "Sales order updated successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Update sales order error:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};

// CONFIRM SALES ORDER
export const confirmSalesOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
        UPDATE sales_orders
        SET
          status = 'CONFIRMED',
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
        message: "Sales order not found or is not in DRAFT status",
      });
    }

    res.json({
      success: true,
      message: "Sales order confirmed successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Confirm sales order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to confirm sales order",
    });
  }
};

// CANCEL SALES ORDER
export const cancelSalesOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
        UPDATE sales_orders
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
        message: "Only draft sales orders can be cancelled",
      });
    }

    res.json({
      success: true,
      message: "Sales order cancelled successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Cancel sales order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel sales order",
    });
  }
};