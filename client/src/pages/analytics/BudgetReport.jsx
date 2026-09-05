import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import StatusBadge from "../../components/StatusBadge";

export default function BudgetReport() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.getBudgetReport(id)
      .then((res) => setReport(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState message="Calculating budget achievement against financial actuals..." />;
  if (!report) return <div className="pageWorkspace">Budget report not found</div>;

  const { budget, lines } = report;

  return (
    <div className="pageWorkspace">
      <div className="pageCard">
        <div className="pageHeader">
          <div>
            <h1 className="pageTitle" style={{ display: "inline-block", marginRight: 12 }}>
              Budget Achievement Report
            </h1>
            <StatusBadge status={budget.status} />
          </div>
          <Link to="/analytics/budgets" className="btnSecondary">Back to Budgets</Link>
        </div>

        <div style={{ background: "#f8f9fa", padding: 16, borderRadius: 6, marginBottom: 24 }}>
          <h3 style={{ margin: 0 }}>{budget.name}</h3>
          <p style={{ margin: "4px 0 0", color: "var(--ufTextMuted)" }}>
            Period: {new Date(budget.start_date).toLocaleDateString()} to {new Date(budget.end_date).toLocaleDateString()} | Responsible: {budget.responsible_name || "N/A"}
          </p>
        </div>

        <table className="dataTable">
          <thead>
            <tr>
              <th>Analytic Account</th>
              <th>Type</th>
              <th>Planned (Committed)</th>
              <th>Actual Achieved</th>
              <th>Achievement %</th>
              <th>Amount To Achieve</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id}>
                <td><strong>{line.analytic_account_name}</strong></td>
                <td><span className="statusBadge statusConfirmed">{line.type}</span></td>
                <td>₹{Number(line.committed_amount).toFixed(2)}</td>
                <td><strong>₹{Number(line.achieved_amount).toFixed(2)}</strong></td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, background: "#e9ecef", borderRadius: 4, height: 10, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${Math.min(line.achievement_percentage, 100)}%`,
                          background: line.achievement_percentage >= 100 ? "var(--ufSuccess)" : "var(--ufPrimary)",
                          height: "100%",
                        }}
                      />
                    </div>
                    <span>{line.achievement_percentage}%</span>
                  </div>
                </td>
                <td>₹{Number(line.amount_to_achieve).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
