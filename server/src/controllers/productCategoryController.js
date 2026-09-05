import pool from "../config/db.js";

// CREATE CATEGORY
export const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const result = await pool.query(
      `INSERT INTO product_categories (name)
       VALUES ($1)
       RETURNING *`,
      [name.trim()]
    );

    return res.status(201).json({
      success: true,
      message: "Product category created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Product category already exists",
      });
    }

    next(error);
  }
};

// GET CATEGORIES
export const getCategories = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM product_categories
       ORDER BY name ASC`
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

// GET CATEGORY BY ID
export const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT *
       FROM product_categories
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product category not found",
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

// UPDATE CATEGORY
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const result = await pool.query(
      `UPDATE product_categories
       SET name = $1
       WHERE id = $2
       RETURNING *`,
      [name.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product category updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Product category already exists",
      });
    }

    next(error);
  }
};

// DELETE CATEGORY
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check whether products are using this category
    const productCheck = await pool.query(
      `SELECT id
       FROM products
       WHERE category_id = $1
       LIMIT 1`,
      [id]
    );

    if (productCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete category because products are using it",
      });
    }

    const result = await pool.query(
      `DELETE FROM product_categories
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product category deleted successfully",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};