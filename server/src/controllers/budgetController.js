import pool from "../config/db.js";

const VALID_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "REVISED",
  "CANCELLED",
];

const VALID_TYPES = ["INCOME", "EXPENSE"];

// =====================================================
// CREATE BUDGET
// =====================================================
export const createBudget = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      name,
      startDate,
      endDate,
      responsibleId,
      lines,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Budget name is required",
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be before start date",
      });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one budget line is required",
      });
    }

    await client.query("BEGIN");

    // ---------------------------------------------
    // VALIDATE RESPONSIBLE CONTACT
    // ---------------------------------------------
    if (responsibleId) {
      const responsibleResult = await client.query(
        `
          SELECT id
          FROM contacts
          WHERE id = $1
            AND is_active = true
        `,
        [responsibleId]
      );

      if (responsibleResult.rows.length === 0) {
        throw new Error("Responsible contact not found");
      }
    }

    // ---------------------------------------------
    // VALIDATE BUDGET LINES
    // ---------------------------------------------
    const processedLines = [];

    for (const line of lines) {
      const {
        analyticAccountId,
        type,
        committedAmount,
      } = line;

      if (!analyticAccountId) {
        throw new Error(
          "Analytic account is required for every budget line"
        );
      }

      if (!VALID_TYPES.includes(type)) {
        throw new Error(
          "Budget line type must be INCOME or EXPENSE"
        );
      }

      const amount = Number(committedAmount);

      if (Number.isNaN(amount) || amount < 0) {
        throw new Error(
          "Committed amount must be 0 or greater"
        );
      }

      const analyticResult = await client.query(
        `
          SELECT id, name, type
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

      if (analyticResult.rows[0].type !== type) {
        throw new Error(
          `Analytic account type must match budget line type (${type})`
        );
      }

      processedLines.push({
        analyticAccountId,
        type,
        committedAmount: amount,
      });
    }

    // ---------------------------------------------
    // CREATE BUDGET
    // ---------------------------------------------
    const budgetResult = await client.query(
      `
        INSERT INTO budgets (
          name,
          start_date,
          end_date,
          responsible_id,
          status
        )
        VALUES ($1, $2, $3, $4, 'DRAFT')
        RETURNING *
      `,
      [
        name.trim(),
        startDate,
        endDate,
        responsibleId || null,
      ]
    );

    const budget = budgetResult.rows[0];

    // ---------------------------------------------
    // CREATE BUDGET LINES
    // ---------------------------------------------
    for (const line of processedLines) {
      await client.query(
        `
          INSERT INTO budget_lines (
            budget_id,
            analytic_account_id,
            type,
            committed_amount
          )
          VALUES ($1, $2, $3, $4)
        `,
        [
          budget.id,
          line.analyticAccountId,
          line.type,
          line.committedAmount.toFixed(2),
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Budget created successfully",
      data: budget,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Create budget error:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};

// =====================================================
// GET ALL BUDGETS
// =====================================================
export const getBudgets = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.*,
        c.name AS responsible_name
      FROM budgets b
      LEFT JOIN contacts c
        ON c.id = b.responsible_id
      ORDER BY b.id DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get budgets error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch budgets",
    });
  }
};

// =====================================================
// GET BUDGET BY ID
// =====================================================
export const getBudgetById = async (req, res) => {
  try {
    const { id } = req.params;

    const budgetResult = await pool.query(
      `
        SELECT
          b.*,
          c.name AS responsible_name
        FROM budgets b
        LEFT JOIN contacts c
          ON c.id = b.responsible_id
        WHERE b.id = $1
      `,
      [id]
    );

    if (budgetResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    const linesResult = await pool.query(
      `
        SELECT
          bl.*,
          aa.name AS analytic_account_name
        FROM budget_lines bl
        LEFT JOIN analytic_accounts aa
          ON aa.id = bl.analytic_account_id
        WHERE bl.budget_id = $1
        ORDER BY bl.id
      `,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...budgetResult.rows[0],
        lines: linesResult.rows,
      },
    });
  } catch (error) {
    console.error("Get budget error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch budget",
    });
  }
};

// =====================================================
// CALCULATE ACHIEVED AMOUNT
// =====================================================
const calculateAchieved = async (
  client,
  budgetId,
  startDate,
  endDate,
  analyticAccountId,
  type
) => {
  let result;

  if (type === "INCOME") {
    result = await client.query(
      `
        SELECT COALESCE(SUM(cil.line_total), 0) AS achieved
        FROM customer_invoice_lines cil
        INNER JOIN customer_invoices ci
          ON ci.id = cil.invoice_id
        WHERE cil.analytic_account_id = $1
          AND ci.invoice_date >= $2
          AND ci.invoice_date <= $3
          AND ci.status IN (
            'CONFIRMED',
            'PARTIALLY_PAID',
            'PAID'
          )
      `,
      [
        analyticAccountId,
        startDate,
        endDate,
      ]
    );
  } else {
    result = await client.query(
      `
        SELECT COALESCE(SUM(vbl.line_total), 0) AS achieved
        FROM vendor_bill_lines vbl
        INNER JOIN vendor_bills vb
          ON vb.id = vbl.vendor_bill_id
        WHERE vbl.analytic_account_id = $1
          AND vb.bill_date >= $2
          AND vb.bill_date <= $3
          AND vb.status IN (
            'CONFIRMED',
            'PARTIALLY_PAID',
            'PAID'
          )
      `,
      [
        analyticAccountId,
        startDate,
        endDate,
      ]
    );
  }

  return Number(result.rows[0].achieved || 0);
};

// =====================================================
// GET BUDGET REPORT
// =====================================================
export const getBudgetReport = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const budgetResult = await client.query(
      `
        SELECT *
        FROM budgets
        WHERE id = $1
      `,
      [id]
    );

    if (budgetResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    const budget = budgetResult.rows[0];

    const linesResult = await client.query(
      `
        SELECT
          bl.id,
          bl.analytic_account_id,
          bl.type,
          bl.committed_amount,
          aa.name AS analytic_account_name
        FROM budget_lines bl
        INNER JOIN analytic_accounts aa
          ON aa.id = bl.analytic_account_id
        WHERE bl.budget_id = $1
        ORDER BY bl.id
      `,
      [id]
    );

    const reportLines = [];

    for (const line of linesResult.rows) {
      const committedAmount = Number(
        line.committed_amount
      );

      const achieved = await calculateAchieved(
        client,
        id,
        budget.start_date,
        budget.end_date,
        line.analytic_account_id,
        line.type
      );

      const percentage =
        committedAmount > 0
          ? (achieved / committedAmount) * 100
          : 0;

      const amountToAchieve =
        committedAmount - achieved;

      reportLines.push({
        id: line.id,
        analytic_account_id: line.analytic_account_id,
        analytic_account_name:
          line.analytic_account_name,
        type: line.type,
        committed_amount: committedAmount.toFixed(2),
        achieved: achieved.toFixed(2),
        achieved_percentage: percentage.toFixed(2),
        amount_to_achieve:
          amountToAchieve.toFixed(2),
      });
    }

    res.json({
      success: true,
      data: {
        budget,
        lines: reportLines,
      },
    });
  } catch (error) {
    console.error("Get budget report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate budget report",
    });
  } finally {
    client.release();
  }
};

// =====================================================
// UPDATE DRAFT BUDGET
// =====================================================
export const updateBudget = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const {
      name,
      startDate,
      endDate,
      responsibleId,
      lines,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Budget name is required",
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be before start date",
      });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one budget line is required",
      });
    }

    await client.query("BEGIN");

    const existingResult = await client.query(
      `
        SELECT *
        FROM budgets
        WHERE id = $1
        FOR UPDATE
      `,
      [id]
    );

    if (existingResult.rows.length === 0) {
      throw new Error("Budget not found");
    }

    if (existingResult.rows[0].status !== "DRAFT") {
      throw new Error(
        "Only draft budgets can be updated"
      );
    }

    if (responsibleId) {
      const responsibleResult = await client.query(
        `
          SELECT id
          FROM contacts
          WHERE id = $1
            AND is_active = true
        `,
        [responsibleId]
      );

      if (responsibleResult.rows.length === 0) {
        throw new Error(
          "Responsible contact not found"
        );
      }
    }

    const processedLines = [];

    for (const line of lines) {
      const {
        analyticAccountId,
        type,
        committedAmount,
      } = line;

      if (!analyticAccountId) {
        throw new Error(
          "Analytic account is required"
        );
      }

      if (!VALID_TYPES.includes(type)) {
        throw new Error(
          "Budget line type must be INCOME or EXPENSE"
        );
      }

      const amount = Number(committedAmount);

      if (Number.isNaN(amount) || amount < 0) {
        throw new Error(
          "Committed amount must be 0 or greater"
        );
      }

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

      if (analyticResult.rows[0].type !== type) {
        throw new Error(
          "Analytic account type does not match budget line type"
        );
      }

      processedLines.push({
        analyticAccountId,
        type,
        committedAmount: amount,
      });
    }

    await client.query(
      `
        UPDATE budgets
        SET
          name = $1,
          start_date = $2,
          end_date = $3,
          responsible_id = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `,
      [
        name.trim(),
        startDate,
        endDate,
        responsibleId || null,
        id,
      ]
    );

    await client.query(
      `DELETE FROM budget_lines WHERE budget_id = $1`,
      [id]
    );

    for (const line of processedLines) {
      await client.query(
        `
          INSERT INTO budget_lines (
            budget_id,
            analytic_account_id,
            type,
            committed_amount
          )
          VALUES ($1, $2, $3, $4)
        `,
        [
          id,
          line.analyticAccountId,
          line.type,
          line.committedAmount.toFixed(2),
        ]
      );
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Budget updated successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Update budget error:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};

// =====================================================
// CONFIRM BUDGET
// =====================================================
export const confirmBudget = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
        UPDATE budgets
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
        message:
          "Budget not found or is not in DRAFT status",
      });
    }

    res.json({
      success: true,
      message: "Budget confirmed successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Confirm budget error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to confirm budget",
    });
  }
};

// =====================================================
// REVISE BUDGET
// =====================================================
export const reviseBudget = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const {
      name,
      startDate,
      endDate,
      responsibleId,
      lines,
    } = req.body;

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "At least one budget line is required",
      });
    }

    await client.query("BEGIN");

    const originalResult = await client.query(
      `
        SELECT *
        FROM budgets
        WHERE id = $1
        FOR UPDATE
      `,
      [id]
    );

    if (originalResult.rows.length === 0) {
      throw new Error("Budget not found");
    }

    const originalBudget = originalResult.rows[0];

    if (
      !["CONFIRMED", "REVISED"].includes(
        originalBudget.status
      )
    ) {
      throw new Error(
        "Only confirmed or revised budgets can be revised"
      );
    }

    // Validate all lines
    const processedLines = [];

    for (const line of lines) {
      const {
        analyticAccountId,
        type,
        committedAmount,
      } = line;

      if (!analyticAccountId) {
        throw new Error(
          "Analytic account is required"
        );
      }

      if (!VALID_TYPES.includes(type)) {
        throw new Error(
          "Budget line type must be INCOME or EXPENSE"
        );
      }

      const amount = Number(committedAmount);

      if (Number.isNaN(amount) || amount < 0) {
        throw new Error(
          "Committed amount must be 0 or greater"
        );
      }

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

      if (analyticResult.rows[0].type !== type) {
        throw new Error(
          "Analytic account type does not match budget line type"
        );
      }

      processedLines.push({
        analyticAccountId,
        type,
        committedAmount: amount,
      });
    }

    // Create revised budget
    const revisedResult = await client.query(
      `
        INSERT INTO budgets (
          name,
          start_date,
          end_date,
          responsible_id,
          status,
          revision_of_id
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          'REVISED',
          $5
        )
        RETURNING *
      `,
      [
        name?.trim() ||
          `${originalBudget.name} - Revision`,
        startDate || originalBudget.start_date,
        endDate || originalBudget.end_date,
        responsibleId || originalBudget.responsible_id,
        id,
      ]
    );

    const revisedBudget = revisedResult.rows[0];

    for (const line of processedLines) {
      await client.query(
        `
          INSERT INTO budget_lines (
            budget_id,
            analytic_account_id,
            type,
            committed_amount
          )
          VALUES ($1, $2, $3, $4)
        `,
        [
          revisedBudget.id,
          line.analyticAccountId,
          line.type,
          line.committedAmount.toFixed(2),
        ]
      );
    }

    // Mark previous budget as revised
    await client.query(
      `
        UPDATE budgets
        SET
          status = 'REVISED',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Budget revised successfully",
      data: revisedBudget,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Revise budget error:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};

// =====================================================
// CANCEL BUDGET
// =====================================================
export const cancelBudget = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
        UPDATE budgets
        SET
          status = 'CANCELLED',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND status IN ('DRAFT', 'CONFIRMED', 'REVISED')
        RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Budget cannot be cancelled",
      });
    }

    res.json({
      success: true,
      message: "Budget cancelled successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Cancel budget error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel budget",
    });
  }
};