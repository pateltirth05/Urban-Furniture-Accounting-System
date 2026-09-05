import pool from "../config/db.js";

const VALID_JOURNAL_TYPES = [
  "SALES",
  "PURCHASE",
  "BANK",
  "CASH",
  "GENERAL",
];

// CREATE JOURNAL
export const createJournal = async (req, res, next) => {
  try {
    const {
      name,
      journalType,
      defaultAccountId,
    } = req.body;

    if (!name || !journalType) {
      return res.status(400).json({
        success: false,
        message: "Journal name and journal type are required",
      });
    }

    if (!VALID_JOURNAL_TYPES.includes(journalType)) {
      return res.status(400).json({
        success: false,
        message:
          "Journal type must be SALES, PURCHASE, BANK, CASH, or GENERAL",
      });
    }

    // Validate default account
    if (defaultAccountId) {
      const account = await pool.query(
        `SELECT id
         FROM chart_of_accounts
         WHERE id = $1
         AND is_active = TRUE`,
        [defaultAccountId]
      );

      if (account.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Default account not found",
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO journals
       (
         name,
         journal_type,
         default_account_id
       )
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        name.trim(),
        journalType,
        defaultAccountId || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Journal created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A journal with this name already exists",
      });
    }

    next(error);
  }
};

// GET ALL ACTIVE JOURNALS
export const getJournals = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         j.*,
         coa.name AS default_account_name
       FROM journals j
       LEFT JOIN chart_of_accounts coa
         ON j.default_account_id = coa.id
       WHERE j.is_active = TRUE
       ORDER BY j.name`
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

// GET JOURNAL BY ID
export const getJournalById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         j.*,
         coa.name AS default_account_name
       FROM journals j
       LEFT JOIN chart_of_accounts coa
         ON j.default_account_id = coa.id
       WHERE j.id = $1
       AND j.is_active = TRUE`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Journal not found",
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

// UPDATE JOURNAL
export const updateJournal = async (req, res, next) => {
  try {
    const { id } = req.params;

    const {
      name,
      journalType,
      defaultAccountId,
    } = req.body;

    if (!name || !journalType) {
      return res.status(400).json({
        success: false,
        message: "Journal name and journal type are required",
      });
    }

    if (!VALID_JOURNAL_TYPES.includes(journalType)) {
      return res.status(400).json({
        success: false,
        message:
          "Journal type must be SALES, PURCHASE, BANK, CASH, or GENERAL",
      });
    }

    if (defaultAccountId) {
      const account = await pool.query(
        `SELECT id
         FROM chart_of_accounts
         WHERE id = $1
         AND is_active = TRUE`,
        [defaultAccountId]
      );

      if (account.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Default account not found",
        });
      }
    }

    const result = await pool.query(
      `UPDATE journals
       SET
         name = $1,
         journal_type = $2,
         default_account_id = $3
       WHERE id = $4
       AND is_active = TRUE
       RETURNING *`,
      [
        name.trim(),
        journalType,
        defaultAccountId || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Journal not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Journal updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A journal with this name already exists",
      });
    }

    next(error);
  }
};

// ARCHIVE JOURNAL
export const archiveJournal = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE journals
       SET is_active = FALSE
       WHERE id = $1
       AND is_active = TRUE
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Journal not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Journal archived successfully",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};