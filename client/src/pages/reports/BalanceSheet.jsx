import { useEffect, useState } from "react";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import ErrorState from "../../components/ErrorState";

export default function BalanceSheet() {
  const [report, setReport] = useState(null);
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await API.getBalanceSheet({ endDate });
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

  if (loading) return <LoadingState message="Generating Balance Sheet from financial ledgers..." />;
  if (error || !report) return <ErrorState message="Failed to load Balance Sheet" onRetry={fetchReport} />;

  const { assets, liabilities, capital, netProfit, totalAssets, totalLiabilities, totalCapital, totalEquityAndLiabilities } = report;

  return (
    <div className="pageWorkspace">
      <div className="pageCard" style={{ maxWidth: 950, margin: "0 auto" }}>
        <div className="pageHeader">
          <h1 className="pageTitle">Balance Sheet Statement</h1>
          <button onClick={() => window.print()} className="btnPrimary">Print Statement</button>
        </div>

        <form onSubmit={handleFilterSubmit} className="filterBar">
          <div className="formGroup" style={{ flexDirection: "row", alignItems: "center" }}>
            <label>As of Date:</label>
            <input type="date" className="formControl" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button type="submit" className="btnSecondary">Apply Date</button>
        </form>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 24 }}>
          {/* ASSETS COLUMN */}
          <div>
            <h3 style={{ color: "var(--ufPrimary)", borderBottom: "2px solid var(--ufPrimary)", paddingBottom: 8 }}>
              ASSETS
            </h3>
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Account</th>
                  <th style={{ textAlign: "right" }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name} ({a.account_subtype})</td>
                    <td style={{ textAlign: "right" }}>₹{Number(a.amount).toFixed(2)}</td>
                  </tr>
                ))}
                <tr style={{ background: "#e9ecef", fontWeight: 700 }}>
                  <td>TOTAL ASSETS</td>
                  <td style={{ textAlign: "right", color: "var(--ufPrimary)", fontSize: 16 }}>
                    ₹{totalAssets.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* LIABILITIES & EQUITY COLUMN */}
          <div>
            <h3 style={{ color: "var(--ufPrimary)", borderBottom: "2px solid var(--ufPrimary)", paddingBottom: 8 }}>
              LIABILITIES & EQUITY
            </h3>
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Account</th>
                  <th style={{ textAlign: "right" }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: "#f8f9fa", fontWeight: 600 }}>
                  <td colSpan="2">Liabilities</td>
                </tr>
                {liabilities.map((l) => (
                  <tr key={l.id}>
                    <td style={{ paddingLeft: 20 }}>{l.name}</td>
                    <td style={{ textAlign: "right" }}>₹{Number(l.amount).toFixed(2)}</td>
                  </tr>
                ))}

                <tr style={{ background: "#f8f9fa", fontWeight: 600 }}>
                  <td colSpan="2">Owner's Equity & Earnings</td>
                </tr>
                {capital.map((c) => (
                  <tr key={c.id}>
                    <td style={{ paddingLeft: 20 }}>{c.name}</td>
                    <td style={{ textAlign: "right" }}>₹{Number(c.amount).toFixed(2)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ paddingLeft: 20 }}>Retained Net Earnings</td>
                  <td style={{ textAlign: "right" }}>₹{netProfit.toFixed(2)}</td>
                </tr>

                <tr style={{ background: "#e9ecef", fontWeight: 700 }}>
                  <td>TOTAL LIABILITIES & EQUITY</td>
                  <td style={{ textAlign: "right", color: "var(--ufPrimary)", fontSize: 16 }}>
                    ₹{totalEquityAndLiabilities.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 24, padding: 12, background: "#f8f9fa", borderRadius: 6, fontWeight: 700, color: "var(--ufSuccess)" }}>
          {Math.abs(totalAssets - totalEquityAndLiabilities) < 0.01 ? "Accounting Balance Equation Satisfied (Assets = Liabilities + Equity) ✓" : "Warning: Balance Sheet Equation Variance!"}
        </div>
      </div>
    </div>
  );
}
