import pool from "../config/db.js";

// =====================================================
// PROFIT & LOSS REPORT
// =====================================================
export const getProfitAndLoss = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start =
      startDate || "1900-01-01";

    const end =
      endDate || "2999-12-31";

    if (new Date(end) < new Date(start)) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be before start date",
      });
    }

    const result = await pool.query(
      `
        SELECT
          coa.id,
          coa.name,
          coa.account_type,
          coa.account_subtype,

          COALESCE(SUM(
            CASE
              WHEN coa.account_type = 'INCOME'
                THEN jel.credit - jel.debit
              WHEN coa.account_type = 'EXPENSE'
                THEN jel.debit - jel.credit
              ELSE 0
            END
          ), 0) AS amount

        FROM chart_of_accounts coa

        LEFT JOIN journal_entry_lines jel
          ON jel.account_id = coa.id

        LEFT JOIN journal_entries je
          ON je.id = jel.journal_entry_id
          AND je.status = 'POSTED'
          AND je.entry_date >= $1
          AND je.entry_date <= $2

        WHERE coa.account_type IN ('INCOME', 'EXPENSE')
          AND coa.is_active = true

        GROUP BY
          coa.id,
          coa.name,
          coa.account_type,
          coa.account_subtype

        ORDER BY
          coa.account_type,
          coa.name
      `,
      [start, end]
    );

    const income = [];
    const expenses = [];

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const row of result.rows) {
      const amount = Number(row.amount || 0);

      const item = {
        id: row.id,
        name: row.name,
        accountType: row.account_type,
        accountSubtype: row.account_subtype,
        amount: amount.toFixed(2),
      };

      if (row.account_type === "INCOME") {
        income.push(item);
        totalIncome += amount;
      }

      if (row.account_type === "EXPENSE") {
        expenses.push(item);
        totalExpenses += amount;
      }
    }

    const netProfitLoss =
      totalIncome - totalExpenses;

    res.json({
      success: true,
      data: {
        period: {
          startDate: start,
          endDate: end,
        },

        income,
        expenses,

        totals: {
          totalIncome: totalIncome.toFixed(2),
          totalExpenses: totalExpenses.toFixed(2),
          netProfitLoss: netProfitLoss.toFixed(2),
          result:
            netProfitLoss >= 0
              ? "PROFIT"
              : "LOSS",
        },
      },
    });
  } catch (error) {
    console.error(
      "Profit and Loss report error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to generate Profit and Loss report",
    });
  }
};