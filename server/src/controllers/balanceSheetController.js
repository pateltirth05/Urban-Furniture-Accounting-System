import pool from "../config/db.js";

// =====================================================
// BALANCE SHEET REPORT
// =====================================================
export const getBalanceSheet = async (req, res) => {
  try {
    const { endDate } = req.query;

    const reportDate = endDate || new Date().toISOString().split("T")[0];

    // -------------------------------------------------
    // Validate date
    // -------------------------------------------------
    if (Number.isNaN(new Date(reportDate).getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid end date",
      });
    }

    // -------------------------------------------------
    // Get all balance sheet accounts
    //
    // ASSET:
    //   Debit - Credit
    //
    // LIABILITY/CAPITAL:
    //   Credit - Debit
    // -------------------------------------------------
    const result = await pool.query(
      `
        SELECT
          coa.id,
          coa.name,
          coa.account_type,
          coa.account_subtype,

          COALESCE(
            SUM(
              CASE
                WHEN coa.account_type = 'ASSET'
                  THEN jel.debit - jel.credit

                WHEN coa.account_type IN ('LIABILITY', 'CAPITAL')
                  THEN jel.credit - jel.debit

                ELSE 0
              END
            ),
            0
          ) AS balance

        FROM chart_of_accounts coa

        LEFT JOIN journal_entry_lines jel
          ON jel.account_id = coa.id

        LEFT JOIN journal_entries je
          ON je.id = jel.journal_entry_id
          AND je.status = 'POSTED'
          AND je.entry_date <= $1

        WHERE coa.account_type IN (
          'ASSET',
          'LIABILITY',
          'CAPITAL'
        )
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
      [reportDate]
    );

    const assets = [];
    const liabilities = [];
    const capital = [];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalCapital = 0;

    // -------------------------------------------------
    // Separate accounts
    // -------------------------------------------------
    for (const row of result.rows) {
      const balance = Number(row.balance || 0);

      const item = {
        id: row.id,
        name: row.name,
        accountType: row.account_type,
        accountSubtype: row.account_subtype,
        balance: balance.toFixed(2),
      };

      if (row.account_type === "ASSET") {
        assets.push(item);
        totalAssets += balance;
      }

      if (row.account_type === "LIABILITY") {
        liabilities.push(item);
        totalLiabilities += balance;
      }

      if (row.account_type === "CAPITAL") {
        capital.push(item);
        totalCapital += balance;
      }
    }

    // -------------------------------------------------
    // Calculate retained earnings / current profit
    //
    // Profit = Income - Expenses
    //
    // Current profit becomes part of equity on the
    // balance sheet.
    // -------------------------------------------------
    const profitResult = await pool.query(
      `
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN coa.account_type = 'INCOME'
                  THEN jel.credit - jel.debit

                WHEN coa.account_type = 'EXPENSE'
                  THEN jel.debit - jel.credit

                ELSE 0
              END
            ),
            0
          ) AS net_profit

        FROM chart_of_accounts coa

        LEFT JOIN journal_entry_lines jel
          ON jel.account_id = coa.id

        LEFT JOIN journal_entries je
          ON je.id = jel.journal_entry_id
          AND je.status = 'POSTED'
          AND je.entry_date <= $1

        WHERE coa.account_type IN (
          'INCOME',
          'EXPENSE'
        )
        AND coa.is_active = true
      `,
      [reportDate]
    );

    const netProfit = Number(
      profitResult.rows[0].net_profit || 0
    );

    const totalEquity =
      totalCapital + netProfit;

    const totalLiabilitiesAndEquity =
      totalLiabilities + totalEquity;

    const difference =
      totalAssets - totalLiabilitiesAndEquity;

    const isBalanced =
      Math.abs(difference) <= 0.005;

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------
    res.json({
      success: true,
      data: {
        reportDate,

        assets: {
          accounts: assets,
          total: totalAssets.toFixed(2),
        },

        liabilities: {
          accounts: liabilities,
          total: totalLiabilities.toFixed(2),
        },

        capital: {
          accounts: capital,
          total: totalCapital.toFixed(2),
        },

        retainedEarnings: netProfit.toFixed(2),

        totalEquity: totalEquity.toFixed(2),

        totalLiabilitiesAndEquity:
          totalLiabilitiesAndEquity.toFixed(2),

        balanceCheck: {
          totalAssets: totalAssets.toFixed(2),
          totalLiabilitiesAndEquity:
            totalLiabilitiesAndEquity.toFixed(2),
          difference: difference.toFixed(2),
          balanced: isBalanced,
        },
      },
    });
  } catch (error) {
    console.error(
      "Balance Sheet report error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to generate Balance Sheet report",
    });
  }
};