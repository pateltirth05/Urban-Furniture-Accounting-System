import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../../services/api";

export default function BudgetForm() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [analytics, setAnalytics] = useState([]);

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [responsibleId, setResponsibleId] = useState("");

  const [lines, setLines] = useState([
    { analytic_account_id: "", type: "EXPENSE", committed_amount: 100000 },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      API.getContacts({ pageSize: 100 }),
      API.getAnalyticAccounts(),
    ]).then(([cRes, aRes]) => {
      setContacts(cRes.data.data);
      setAnalytics(aRes.data.data);
      if (cRes.data.data.length > 0) setResponsibleId(cRes.data.data[0].id);
    });
  }, []);

  const handleLineChange = (index, field, value) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { analytic_account_id: "", type: "EXPENSE", committed_amount: 100000 }]);
  };

  const removeLine = (index) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name || !startDate || !endDate) return setError("Name and dates are required");
    if (lines.some((l) => !l.analytic_account_id || Number(l.committed_amount) <= 0)) {
      return setError("Complete all budget lines with amounts > 0");
    }

    setSaving(true);
    try {
      await API.createBudget({
        name,
        start_date: startDate,
        end_date: endDate,
        responsible_id: responsibleId || null,
        lines,
      });
      navigate("/analytics/budgets");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create budget");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pageWorkspace">
      <div className="pageCard">
        <div className="pageHeader">
          <h1 className="pageTitle">New Budget Plan</h1>
          <button onClick={() => navigate("/analytics/budgets")} className="btnSecondary">Cancel</button>
        </div>

        {error && <div className="errorText" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="formGrid">
            <div className="formGroup" style={{ gridColumn: "1 / -1" }}>
              <label>Budget Title *</label>
              <input
                type="text"
                className="formControl"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Q1 Infrastructure Budget"
              />
            </div>

            <div className="formGroup">
              <label>Start Date *</label>
              <input type="date" className="formControl" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="formGroup">
              <label>End Date *</label>
              <input type="date" className="formControl" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>

            <div className="formGroup">
              <label>Responsible Contact</label>
              <select className="formControl" value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)}>
                <option value="">Select Responsible</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <h3>Planned Budget Lines</h3>
          <table className="lineItemsTable">
            <thead>
              <tr>
                <th>Analytic Account *</th>
                <th>Type *</th>
                <th>Committed Amount (₹) *</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx}>
                  <td>
                    <select
                      className="formControl"
                      value={line.analytic_account_id}
                      onChange={(e) => handleLineChange(idx, "analytic_account_id", e.target.value)}
                      required
                    >
                      <option value="">Select Analytic Account</option>
                      {analytics.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="formControl"
                      value={line.type}
                      onChange={(e) => handleLineChange(idx, "type", e.target.value)}
                    >
                      <option value="EXPENSE">Expense Target</option>
                      <option value="INCOME">Income Target</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      className="formControl"
                      value={line.committed_amount}
                      onChange={(e) => handleLineChange(idx, "committed_amount", e.target.value)}
                      required
                    />
                  </td>
                  <td>
                    {lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(idx)} className="btnDanger" style={{ padding: "2px 6px" }}>
                        X
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button type="button" onClick={addLine} className="btnSecondary" style={{ marginBottom: 20 }}>
            + Add Budget Line
          </button>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => navigate("/analytics/budgets")} className="btnSecondary">Cancel</button>
            <button type="submit" className="btnPrimary" disabled={saving}>
              {saving ? "Saving..." : "Save Budget Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
