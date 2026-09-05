import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../../services/api";

export default function JournalEntryForm() {
  const navigate = useNavigate();
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [analytics, setAnalytics] = useState([]);

  const [journalId, setJournalId] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [partnerId, setPartnerId] = useState("");

  const [lines, setLines] = useState([
    { account_id: "", debit: 0, credit: 0, partner_id: "", analytic_account_id: "" },
    { account_id: "", debit: 0, credit: 0, partner_id: "", analytic_account_id: "" },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      API.getJournals(),
      API.getAccounts(),
      API.getContacts({ pageSize: 100 }),
      API.getAnalyticAccounts(),
    ]).then(([jRes, aRes, cRes, anRes]) => {
      setJournals(jRes.data.data);
      setAccounts(aRes.data.data);
      setContacts(cRes.data.data);
      setAnalytics(anRes.data.data);
      if (jRes.data.data.length > 0) setJournalId(jRes.data.data[0].id);
    });
  }, []);

  const totalDebit = lines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleLineChange = (index, field, value) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    if (field === "debit" && Number(value) > 0) newLines[index].credit = 0;
    if (field === "credit" && Number(value) > 0) newLines[index].debit = 0;
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { account_id: "", debit: 0, credit: 0, partner_id: "", analytic_account_id: "" }]);
  };

  const removeLine = (index) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!journalId) return setError("Please select a Journal");
    if (!isBalanced) return setError("Total Debit must equal Total Credit and be > 0");

    setSaving(true);
    try {
      await API.createJournalEntry({
        journal_id: journalId,
        entry_date: entryDate,
        reference,
        partner_id: partnerId || null,
        lines,
      });
      navigate("/accounting/journal-entries");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create journal entry");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pageWorkspace">
      <div className="pageCard">
        <div className="pageHeader">
          <h1 className="pageTitle">New Journal Entry</h1>
          <button onClick={() => navigate("/accounting/journal-entries")} className="btnSecondary">Cancel</button>
        </div>

        {error && <div className="errorText" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="formGrid">
            <div className="formGroup">
              <label>Journal *</label>
              <select className="formControl" value={journalId} onChange={(e) => setJournalId(e.target.value)} required>
                {journals.map((j) => (
                  <option key={j.id} value={j.id}>{j.name} ({j.journal_type})</option>
                ))}
              </select>
            </div>

            <div className="formGroup">
              <label>Entry Date *</label>
              <input type="date" className="formControl" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />
            </div>

            <div className="formGroup">
              <label>Reference</label>
              <input type="text" className="formControl" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. Month-end Accrual" />
            </div>

            <div className="formGroup">
              <label>Partner / Contact</label>
              <select className="formControl" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                <option value="">Select Partner (Optional)</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <h3>Journal Lines (Double-Entry)</h3>
          <table className="lineItemsTable">
            <thead>
              <tr>
                <th>Account *</th>
                <th>Debit (₹)</th>
                <th>Credit (₹)</th>
                <th>Analytic Account</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx}>
                  <td>
                    <select
                      className="formControl"
                      value={line.account_id}
                      onChange={(e) => handleLineChange(idx, "account_id", e.target.value)}
                      required
                    >
                      <option value="">Select Account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name} ({a.account_type})</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="formControl"
                      value={line.debit}
                      onChange={(e) => handleLineChange(idx, "debit", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="formControl"
                      value={line.credit}
                      onChange={(e) => handleLineChange(idx, "credit", e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      className="formControl"
                      value={line.analytic_account_id}
                      onChange={(e) => handleLineChange(idx, "analytic_account_id", e.target.value)}
                    >
                      <option value="">Select Analytic</option>
                      {analytics.map((an) => (
                        <option key={an.id} value={an.id}>{an.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {lines.length > 2 && (
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
            + Add Line Row
          </button>

          <div style={{ background: "#f8f9fa", padding: 16, borderRadius: 6, marginBottom: 20, display: "flex", justifyContent: "space-between" }}>
            <div>Total Debit: <strong>₹{totalDebit.toFixed(2)}</strong></div>
            <div>Total Credit: <strong>₹{totalCredit.toFixed(2)}</strong></div>
            <div style={{ color: isBalanced ? "var(--ufSuccess)" : "var(--ufDanger)", fontWeight: 700 }}>
              {isBalanced ? "Balanced ✓" : "Out of Balance ✗"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => navigate("/accounting/journal-entries")} className="btnSecondary">Cancel</button>
            <button type="submit" className="btnPrimary" disabled={saving || !isBalanced}>
              {saving ? "Saving..." : "Save Draft Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
