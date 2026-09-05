import pool from "../config/db.js";

// =====================================================
// STOCK REPORT
// =====================================================
export const getStockReport = async (req, res) => {
  try {
    const { productId } = req.query;

    const params = [];
    let productFilter = "";

    if (productId) {
      params.push(productId);
      productFilter = `AND p.id = $${params.length}`;
    }

    const result = await pool.query(
      `
        SELECT
          p.id,
          p.name,
          p.product_type,

          COALESCE(
            SUM(
              CASE
                WHEN sm.movement_type = 'IN'
                  THEN sm.quantity
                ELSE 0
              END
            ),
            0
          ) AS purchased_quantity,

          COALESCE(
            SUM(
              CASE
                WHEN sm.movement_type = 'OUT'
                  THEN sm.quantity
                ELSE 0
              END
            ),
            0
          ) AS sold_quantity,

          COALESCE(
            SUM(
              CASE
                WHEN sm.movement_type = 'IN'
                  THEN sm.quantity
                WHEN sm.movement_type = 'OUT'
                  THEN -sm.quantity
                ELSE 0
              END
            ),
            0
          ) AS current_stock

        FROM products p

        LEFT JOIN stock_movements sm
          ON sm.product_id = p.id

        WHERE p.is_active = true
          AND p.product_type = 'GOODS'
          ${productFilter}

        GROUP BY
          p.id,
          p.name,
          p.product_type

        ORDER BY p.name
      `,
      params
    );

    const data = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      productType: row.product_type,
      purchasedQuantity: Number(
        row.purchased_quantity
      ).toFixed(2),
      soldQuantity: Number(
        row.sold_quantity
      ).toFixed(2),
      currentStock: Number(
        row.current_stock
      ).toFixed(2),
    }));

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get stock report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate stock report",
    });
  }
};

// =====================================================
// STOCK MOVEMENTS
// =====================================================
export const getStockMovements = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        sm.*,
        p.name AS product_name
      FROM stock_movements sm
      INNER JOIN products p
        ON p.id = sm.product_id
      ORDER BY
        sm.movement_date DESC,
        sm.id DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      "Get stock movements error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch stock movements",
    });
  }
};