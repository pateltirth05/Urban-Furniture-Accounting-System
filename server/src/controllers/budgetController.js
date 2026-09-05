const { query, withTransaction } = require("../config/db");

async function list(req, res) {
  try {
    const result = await query(
      `SELECT b.*, c.name AS responsible_name
       FROM budgets b
       LEFT JOIN contacts c ON c.id = b.responsible_id
       ORDER BY b.start_date DESC`
    );
    return res.json({ data: result.rows });
  } catch (err) {
    console.error("budgets.list error", err);
    return res.status(500).json({ message: "Failed to list budgets" });
  }
}

async function getById(req, res) {
  try {
    const budgetRes = await query(
      `SELECT b.*, c.name AS responsible_name
       FROM budgets b
       LEFT JOIN contacts c ON c.id = b.responsible_id
       WHERE b.id = $1`,
      [req.params.id]
    );
    if (budgetRes.rows.length === 0) {
      return res.status(404).json({ message: "Budget not found" });
    }

    const linesRes = await query(
      `SELECT bl.*, aa.name AS analytic_account_name
       FROM budget_lines bl
       JOIN analytic_accounts aa ON aa.id = bl.analytic_account_id
       WHERE bl.budget_id = $1`,
      [req.params.id]
    );

    return res.json({
      data: {
        ...budgetRes.rows[0],
        lines: linesRes.rows,
      },
    });
  } catch (err) {
    console.error("budgets.getById error", err);
    return res.status(500).json({ message: "Failed to load budget" });
  }
}

async function create(req, res) {
  const { name, start_date, end_date, responsible_id, lines } = req.body;

  if (!name || !start_date || !end_date || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ message: "name, start_date, end_date, and lines are required" });
  }

  try {
    const result = await withTransaction(async (client) => {
      const budgetRes = await client.query(
        `INSERT INTO budgets (name, start_date, end_date, responsible_id, status)
         VALUES ($1, $2, $3, $4, 'DRAFT')
         RETURNING *`,
        [name, start_date, end_date, responsible_id || null]
      );
      const budget = budgetRes.rows[0];

      for (const line of lines) {
        await client.query(
          `INSERT INTO budget_lines (budget_id, analytic_account_id, type, committed_amount)
           VALUES ($1, $2, $3, $4)`,
          [budget.id, line.analytic_account_id, line.type, Number(line.committed_amount) || 0]
        );
      }

      return budget;
    });

    return res.status(201).json({ data: result });
  } catch (err) {
    console.error("budgets.create error", err);
    return res.status(400).json({ message: err.message || "Failed to create budget" });
  }
}

async function confirmBudget(req, res) {
  try {
    const result = await query(
      "UPDATE budgets SET status = 'CONFIRMED' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Budget not found" });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("budgets.confirmBudget error", err);
    return res.status(500).json({ message: "Failed to confirm budget" });
  }
}

async function getReport(req, res) {
  try {
    const budgetRes = await query(
      `SELECT b.*, c.name AS responsible_name
       FROM budgets b
       LEFT JOIN contacts c ON c.id = b.responsible_id
       WHERE b.id = $1`,
      [req.params.id]
    );
    if (budgetRes.rows.length === 0) {
      return res.status(404).json({ message: "Budget not found" });
    }
    const budget = budgetRes.rows[0];

    const linesRes = await query(
      `SELECT bl.*, aa.name AS analytic_account_name
       FROM budget_lines bl
       JOIN analytic_accounts aa ON aa.id = bl.analytic_account_id
       WHERE bl.budget_id = $1`,
      [budget.id]
    );

    // Calculate actuals per line from journal_entry_lines with matching analytic_account_id in date range
    const reportLines = await Promise.all(
      linesRes.rows.map(async (line) => {
        const actualRes = await query(
          `SELECT COALESCE(SUM(
             CASE WHEN $1 = 'INCOME' THEN jel.credit - jel.debit ELSE jel.debit - jel.credit END
           ), 0)::numeric AS achieved
           FROM journal_entry_lines jel
           JOIN journal_entries je ON je.id = jel.journal_entry_id
           WHERE jel.analytic_account_id = $2
             AND je.status = 'POSTED'
             AND je.entry_date BETWEEN $3 AND $4`,
          [line.type, line.analytic_account_id, budget.start_date, budget.end_date]
        );

        const achieved = Number(actualRes.rows[0].achieved) || 0;
        const committed = Number(line.committed_amount) || 0;
        const achievementPct = committed > 0 ? (achieved / committed) * 100 : 0;
        const amountToAchieve = Math.max(0, committed - achieved);

        return {
          ...line,
          achieved_amount: achieved,
          achievement_percentage: Math.round(achievementPct * 100) / 100,
          amount_to_achieve: amountToAchieve,
        };
      })
    );

    return res.json({
      data: {
        budget,
        lines: reportLines,
      },
    });
  } catch (err) {
    console.error("budgets.getReport error", err);
    return res.status(500).json({ message: "Failed to generate budget report" });
  }
}

module.exports = { list, getById, create, confirmBudget, getReport };
