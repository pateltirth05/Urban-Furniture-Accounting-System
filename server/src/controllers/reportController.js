const { query } = require("../config/db");

async function getProfitAndLoss(req, res) {
  const { startDate, endDate } = req.query;

  const conditions = ["je.status = 'POSTED'"];
  const params = [];

  if (startDate) {
    params.push(startDate);
    conditions.push(`je.entry_date >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate);
    conditions.push(`je.entry_date <= $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  try {
    const incomeRes = await query(
      `SELECT coa.id, coa.name, coa.account_subtype,
              COALESCE(SUM(jel.credit - jel.debit), 0)::numeric AS amount
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id
       JOIN chart_of_accounts coa ON coa.id = jel.account_id
       ${whereClause} AND coa.account_type = 'INCOME'
       GROUP BY coa.id, coa.name, coa.account_subtype
       ORDER BY coa.name ASC`,
      params
    );

    const expenseRes = await query(
      `SELECT coa.id, coa.name, coa.account_subtype,
              COALESCE(SUM(jel.debit - jel.credit), 0)::numeric AS amount
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id
       JOIN chart_of_accounts coa ON coa.id = jel.account_id
       ${whereClause} AND coa.account_type = 'EXPENSE'
       GROUP BY coa.id, coa.name, coa.account_subtype
       ORDER BY coa.name ASC`,
      params
    );

    const incomeAccounts = incomeRes.rows;
    const expenseAccounts = expenseRes.rows;

    const totalIncome = incomeAccounts.reduce((acc, row) => acc + Number(row.amount), 0);
    const totalExpense = expenseAccounts.reduce((acc, row) => acc + Number(row.amount), 0);
    const netProfit = totalIncome - totalExpense;

    return res.json({
      data: {
        income: incomeAccounts,
        expense: expenseAccounts,
        totalIncome,
        totalExpense,
        netProfit,
      },
    });
  } catch (err) {
    console.error("report.getProfitAndLoss error", err);
    return res.status(500).json({ message: "Failed to generate Profit and Loss report" });
  }
}

async function getDashboardSummary(req, res) {
  try {
    const salesRes = await query("SELECT COALESCE(SUM(total_amount), 0)::numeric AS total FROM customer_invoices WHERE status != 'CANCELLED'");
    const purchaseRes = await query("SELECT COALESCE(SUM(total_amount), 0)::numeric AS total FROM vendor_bills WHERE status != 'CANCELLED'");
    const pendingInvRes = await query("SELECT COALESCE(SUM(amount_due), 0)::numeric AS total FROM customer_invoices WHERE status IN ('CONFIRMED', 'PARTIALLY_PAID')");
    const pendingBillRes = await query("SELECT COALESCE(SUM(amount_due), 0)::numeric AS total FROM vendor_bills WHERE status IN ('CONFIRMED', 'PARTIALLY_PAID')");

    const pnlRes = await query(
      `SELECT 
         COALESCE(SUM(CASE WHEN coa.account_type = 'INCOME' THEN jel.credit - jel.debit ELSE 0 END), 0)::numeric AS income,
         COALESCE(SUM(CASE WHEN coa.account_type = 'EXPENSE' THEN jel.debit - jel.credit ELSE 0 END), 0)::numeric AS expense
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id
       JOIN chart_of_accounts coa ON coa.id = jel.account_id
       WHERE je.status = 'POSTED'`
    );

    const income = Number(pnlRes.rows[0].income);
    const expense = Number(pnlRes.rows[0].expense);

    return res.json({
      data: {
        totalSales: Number(salesRes.rows[0].total),
        totalPurchases: Number(purchaseRes.rows[0].total),
        pendingInvoices: Number(pendingInvRes.rows[0].total),
        pendingBills: Number(pendingBillRes.rows[0].total),
        income,
        expense,
        netProfit: income - expense,
      },
    });
  } catch (err) {
    console.error("report.getDashboardSummary error", err);
    return res.status(500).json({ message: "Failed to load dashboard summary" });
  }
}

module.exports = { getProfitAndLoss, getDashboardSummary };
