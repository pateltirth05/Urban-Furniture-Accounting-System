import pool from "../config/db.js";

const VALID_TYPES = ["INCOME", "EXPENSE"];

// CREATE
export const createAnalyticAccount = async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be INCOME or EXPENSE",
      });
    }

    const existing = await pool.query(
      `SELECT id FROM analytic_accounts WHERE LOWER(name) = LOWER($1)`,
      [name.trim()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Analytic account already exists",
      });
    }

    const result = await pool.query(
      `
        INSERT INTO analytic_accounts (name, type)
        VALUES ($1, $2)
        RETURNING *
      `,
      [name.trim(), type]
    );

    res.status(201).json({
      success: true,
      message: "Analytic account created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create analytic account error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create analytic account",
    });
  }
};

// GET ALL
export const getAnalyticAccounts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM analytic_accounts
      ORDER BY id DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get analytic accounts error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch analytic accounts",
    });
  }
};

// GET BY ID
export const getAnalyticAccountById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
        SELECT *
        FROM analytic_accounts
        WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Analytic account not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get analytic account error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch analytic account",
    });
  }
};

// UPDATE
export const updateAnalyticAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be INCOME or EXPENSE",
      });
    }

    const existing = await pool.query(
      `
        SELECT id
        FROM analytic_accounts
        WHERE LOWER(name) = LOWER($1)
          AND id <> $2
      `,
      [name.trim(), id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Analytic account already exists",
      });
    }

    const result = await pool.query(
      `
        UPDATE analytic_accounts
        SET
          name = $1,
          type = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `,
      [name.trim(), type, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Analytic account not found",
      });
    }

    res.json({
      success: true,
      message: "Analytic account updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update analytic account error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update analytic account",
    });
  }
};

// ARCHIVE
export const archiveAnalyticAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
        UPDATE analytic_accounts
        SET
          is_active = false,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Analytic account not found",
      });
    }

    res.json({
      success: true,
      message: "Analytic account archived successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Archive analytic account error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to archive analytic account",
    });
  }
};