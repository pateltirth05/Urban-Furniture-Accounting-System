const { query } = require("../config/db");

async function getBalanceSheet(req, res) {
  const { endDate } = req.query;

  const conditions = ["je.status = 'POSTED'"];
  const params = [];

  if (endDate) {
    params.push(endDate);
    conditions.push(`je.entry_date <= $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  try {
    const assetRes = await query(
      `SELECT coa.id, coa.name, coa.account_subtype,
              COALESCE(SUM(jel.debit - jel.credit), 0)::numeric AS amount
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id
       JOIN chart_of_accounts coa ON coa.id = jel.account_id
       ${whereClause} AND coa.account_type = 'ASSET'
       GROUP BY coa.id, coa.name, coa.account_subtype
       ORDER BY coa.name ASC`,
      params
    );

    const liabilityRes = await query(
      `SELECT coa.id, coa.name, coa.account_subtype,
              COALESCE(SUM(jel.credit - jel.debit), 0)::numeric AS amount
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id
       JOIN chart_of_accounts coa ON coa.id = jel.account_id
       ${whereClause} AND coa.account_type = 'LIABILITY'
       GROUP BY coa.id, coa.name, coa.account_subtype
       ORDER BY coa.name ASC`,
      params
    );

    const capitalRes = await query(
      `SELECT coa.id, coa.name, coa.account_subtype,
              COALESCE(SUM(jel.credit - jel.debit), 0)::numeric AS amount
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id
       JOIN chart_of_accounts coa ON coa.id = jel.account_id
       ${whereClause} AND coa.account_type = 'CAPITAL'
       GROUP BY coa.id, coa.name, coa.account_subtype
       ORDER BY coa.name ASC`,
      params
    );

    const pnlRes = await query(
      `SELECT 
         COALESCE(SUM(CASE WHEN coa.account_type = 'INCOME' THEN jel.credit - jel.debit ELSE 0 END), 0)::numeric AS income,
         COALESCE(SUM(CASE WHEN coa.account_type = 'EXPENSE' THEN jel.debit - jel.credit ELSE 0 END), 0)::numeric AS expense
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id
       JOIN chart_of_accounts coa ON coa.id = jel.account_id
       ${whereClause}`,
      params
    );

    const netProfit = Number(pnlRes.rows[0].income) - Number(pnlRes.rows[0].expense);

    const assets = assetRes.rows;
    const liabilities = liabilityRes.rows;
    const capital = capitalRes.rows;

    const totalAssets = assets.reduce((acc, row) => acc + Number(row.amount), 0);
    const totalLiabilities = liabilities.reduce((acc, row) => acc + Number(row.amount), 0);
    const totalCapital = capital.reduce((acc, row) => acc + Number(row.amount), 0);
    const totalEquityAndLiabilities = totalLiabilities + totalCapital + netProfit;

    return res.json({
      data: {
        assets,
        liabilities,
        capital,
        netProfit,
        totalAssets,
        totalLiabilities,
        totalCapital,
        totalEquityAndLiabilities,
      },
    });
  } catch (err) {
    console.error("balanceSheet.getBalanceSheet error", err);
    return res.status(500).json({ message: "Failed to generate Balance Sheet" });
  }
}

module.exports = { getBalanceSheet };
