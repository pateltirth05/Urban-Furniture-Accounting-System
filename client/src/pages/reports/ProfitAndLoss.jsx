import { useEffect, useState } from "react";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import ErrorState from "../../components/ErrorState";

export default function ProfitAndLoss() {
  const [report, setReport] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await API.getProfitAndLoss({ startDate, endDate });
      setReport(res.data.data);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchReport();
  };

  if (loading) return <LoadingState message="Generating Profit and Loss Statement from ledger..." />;
  if (error || !report) return <ErrorState message="Failed to load P&L report" onRetry={fetchReport} />;

  const { income, expense, totalIncome, totalExpense, netProfit } = report;

  return (
    <div className="pageWorkspace">
      <div className="pageCard" style={{ maxWidth: 900, margin: "0 auto" }}>
        <div className="pageHeader">
          <h1 className="pageTitle">Profit and Loss Statement</h1>
          <button onClick={() => window.print()} className="btnPrimary">Print Statement</button>
        </div>

        <form onSubmit={handleFilterSubmit} className="filterBar">
          <div className="formGroup" style={{ flexDirection: "row", alignItems: "center" }}>
            <label>Start Date:</label>
            <input type="date" className="formControl" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="formGroup" style={{ flexDirection: "row", alignItems: "center" }}>
            <label>End Date:</label>
            <input type="date" className="formControl" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button type="submit" className="btnSecondary">Apply Dates</button>
        </form>

        <div style={{ marginTop: 24 }}>
          <h3 style={{ color: "var(--ufSuccess)", borderBottom: "2px solid var(--ufSuccess)", paddingBottom: 8 }}>
            Operating Income
          </h3>
          <table className="dataTable" style={{ marginBottom: 20 }}>
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Subtype</th>
                <th style={{ textAlign: "right" }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {income.map((acc) => (
                <tr key={acc.id}>
                  <td>{acc.name}</td>
                  <td>{acc.account_subtype || "Income"}</td>
                  <td style={{ textAlign: "right" }}>₹{Number(acc.amount).toFixed(2)}</td>
                </tr>
              ))}
              <tr style={{ background: "#f8f9fa", fontWeight: 700 }}>
                <td colSpan="2">Total Operating Income</td>
                <td style={{ textAlign: "right", color: "var(--ufSuccess)", fontSize: 16 }}>
                  ₹{totalIncome.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ color: "var(--ufDanger)", borderBottom: "2px solid var(--ufDanger)", paddingBottom: 8 }}>
            Operating Expenses
          </h3>
          <table className="dataTable" style={{ marginBottom: 20 }}>
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Subtype</th>
                <th style={{ textAlign: "right" }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {expense.map((acc) => (
                <tr key={acc.id}>
                  <td>{acc.name}</td>
                  <td>{acc.account_subtype || "Expense"}</td>
                  <td style={{ textAlign: "right" }}>₹{Number(acc.amount).toFixed(2)}</td>
                </tr>
              ))}
              <tr style={{ background: "#f8f9fa", fontWeight: 700 }}>
                <td colSpan="2">Total Operating Expenses</td>
                <td style={{ textAlign: "right", color: "var(--ufDanger)", fontSize: 16 }}>
                  ₹{totalExpense.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          <div
            style={{
              background: netProfit >= 0 ? "rgba(40, 167, 69, 0.1)" : "rgba(220, 53, 69, 0.1)",
              border: `2px solid ${netProfit >= 0 ? "var(--ufSuccess)" : "var(--ufDanger)"}`,
              padding: 20,
              borderRadius: 8,
              display: "flex",
              justify: "space-between",
              alignItems: "center",
              marginTop: 24,
            }}
          >
            <h2 style={{ margin: 0 }}>Net Profit / (Loss)</h2>
            <h1 style={{ margin: 0, color: netProfit >= 0 ? "var(--ufSuccess)" : "var(--ufDanger)" }}>
              ₹{netProfit.toFixed(2)}
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}
