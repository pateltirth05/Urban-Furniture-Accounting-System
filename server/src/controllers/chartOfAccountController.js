import pool from "../config/db.js";

const VALID_ACCOUNT_TYPES = [
  "ASSET",
  "LIABILITY",
  "EXPENSE",
  "INCOME",
  "CAPITAL",
];

// CREATE ACCOUNT
export const createAccount = async (req, res, next) => {
  try {
    const {
      name,
      accountType,
      accountSubtype,
    } = req.body;

    if (!name || !accountType) {
      return res.status(400).json({
        success: false,
        message: "Account name and account type are required",
      });
    }

    if (!VALID_ACCOUNT_TYPES.includes(accountType)) {
      return res.status(400).json({
        success: false,
        message:
          "Account type must be ASSET, LIABILITY, EXPENSE, INCOME, or CAPITAL",
      });
    }

    const result = await pool.query(
      `INSERT INTO chart_of_accounts
       (
         name,
         account_type,
         account_subtype
       )
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        name.trim(),
        accountType,
        accountSubtype || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with this name already exists",
      });
    }

    next(error);
  }
};

// GET ALL ACTIVE ACCOUNTS
export const getAccounts = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM chart_of_accounts
       WHERE is_active = TRUE
       ORDER BY account_type, name`
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

// GET ACCOUNT BY ID
export const getAccountById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT *
       FROM chart_of_accounts
       WHERE id = $1
       AND is_active = TRUE`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
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

// UPDATE ACCOUNT
export const updateAccount = async (req, res, next) => {
  try {
    const { id } = req.params;

    const {
      name,
      accountType,
      accountSubtype,
    } = req.body;

    if (!name || !accountType) {
      return res.status(400).json({
        success: false,
        message: "Account name and account type are required",
      });
    }

    if (!VALID_ACCOUNT_TYPES.includes(accountType)) {
      return res.status(400).json({
        success: false,
        message:
          "Account type must be ASSET, LIABILITY, EXPENSE, INCOME, or CAPITAL",
      });
    }

    const result = await pool.query(
      `UPDATE chart_of_accounts
       SET
         name = $1,
         account_type = $2,
         account_subtype = $3
       WHERE id = $4
       AND is_active = TRUE
       RETURNING *`,
      [
        name.trim(),
        accountType,
        accountSubtype || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Account updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with this name already exists",
      });
    }

    next(error);
  }
};

// ARCHIVE ACCOUNT
export const archiveAccount = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE chart_of_accounts
       SET is_active = FALSE
       WHERE id = $1
       AND is_active = TRUE
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Account archived successfully",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};