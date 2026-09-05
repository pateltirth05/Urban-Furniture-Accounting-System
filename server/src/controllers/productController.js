import pool from "../config/db.js";

// CREATE PRODUCT
export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      categoryId,
      productType,
      salesPrice,
      costPrice,
      image,
    } = req.body;

    if (!name || !productType) {
      return res.status(400).json({
        success: false,
        message: "Product name and product type are required",
      });
    }

    const validTypes = ["GOODS", "SERVICE", "COMBO"];

    if (!validTypes.includes(productType)) {
      return res.status(400).json({
        success: false,
        message: "Product type must be GOODS, SERVICE, or COMBO",
      });
    }

    if (salesPrice === undefined || salesPrice === null) {
      return res.status(400).json({
        success: false,
        message: "Sales price is required",
      });
    }

    if (Number(salesPrice) < 0 || Number(costPrice || 0) < 0) {
      return res.status(400).json({
        success: false,
        message: "Prices cannot be negative",
      });
    }

    // Validate category if supplied
    if (categoryId) {
      const category = await pool.query(
        `SELECT id
         FROM product_categories
         WHERE id = $1`,
        [categoryId]
      );

      if (category.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Product category not found",
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO products
      (
        name,
        category_id,
        product_type,
        sales_price,
        cost_price,
        image
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        name.trim(),
        categoryId || null,
        productType,
        Number(salesPrice),
        Number(costPrice || 0),
        image || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL ACTIVE PRODUCTS
export const getProducts = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         p.*,
         pc.name AS category_name
       FROM products p
       LEFT JOIN product_categories pc
         ON p.category_id = pc.id
       WHERE p.is_active = TRUE
       ORDER BY p.created_at DESC`
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

// GET PRODUCT BY ID
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         p.*,
         pc.name AS category_name
       FROM products p
       LEFT JOIN product_categories pc
         ON p.category_id = pc.id
       WHERE p.id = $1
       AND p.is_active = TRUE`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE PRODUCT
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const {
      name,
      categoryId,
      productType,
      salesPrice,
      costPrice,
      image,
    } = req.body;

    if (!name || !productType) {
      return res.status(400).json({
        success: false,
        message: "Product name and product type are required",
      });
    }

    const validTypes = ["GOODS", "SERVICE", "COMBO"];

    if (!validTypes.includes(productType)) {
      return res.status(400).json({
        success: false,
        message: "Product type must be GOODS, SERVICE, or COMBO",
      });
    }

    if (salesPrice === undefined || salesPrice === null) {
      return res.status(400).json({
        success: false,
        message: "Sales price is required",
      });
    }

    if (Number(salesPrice) < 0 || Number(costPrice || 0) < 0) {
      return res.status(400).json({
        success: false,
        message: "Prices cannot be negative",
      });
    }

    if (categoryId) {
      const category = await pool.query(
        `SELECT id
         FROM product_categories
         WHERE id = $1`,
        [categoryId]
      );

      if (category.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Product category not found",
        });
      }
    }

    const result = await pool.query(
      `UPDATE products
       SET
         name = $1,
         category_id = $2,
         product_type = $3,
         sales_price = $4,
         cost_price = $5,
         image = $6
       WHERE id = $7
       AND is_active = TRUE
       RETURNING *`,
      [
        name.trim(),
        categoryId || null,
        productType,
        Number(salesPrice),
        Number(costPrice || 0),
        image || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// ARCHIVE PRODUCT
export const archiveProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE products
       SET is_active = FALSE
       WHERE id = $1
       AND is_active = TRUE
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product archived successfully",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};