import { useEffect, useState } from "react";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import ErrorState from "../../components/ErrorState";

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({ name: "", account_type: "ASSET", account_subtype: "" });

  const loadAccounts = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await API.getAccounts({ account_type: typeFilter });
      setAccounts(res.data.data);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [typeFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.createAccount(formData);
      setShowModal(false);
      setFormData({ name: "", account_type: "ASSET", account_subtype: "" });
      loadAccounts();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create account");
    }
  };

  return (
    <div className="pageWorkspace">
      <div className="pageCard">
        <div className="pageHeader">
          <h1 className="pageTitle">Chart of Accounts</h1>
          <button onClick={() => setShowModal(true)} className="btnPrimary">+ Add Account</button>
        </div>

        <div className="filterBar">
          <select className="filterSelect" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Account Types</option>
            <option value="ASSET">Asset</option>
            <option value="LIABILITY">Liability</option>
            <option value="CAPITAL">Capital / Equity</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
        </div>

        {loading ? (
          <LoadingState message="Loading chart of accounts..." />
        ) : error ? (
          <ErrorState message="Failed to load chart of accounts" onRetry={loadAccounts} />
        ) : (
          <table className="dataTable">
            <thead>
              <tr>
                <th>ID</th>
                <th>Account Name</th>
                <th>Type</th>
                <th>Subtype</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td><strong>{a.name}</strong></td>
                  <td><span className="statusBadge statusConfirmed">{a.account_type}</span></td>
                  <td>{a.account_subtype || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showModal && (
          <div className="modalBackdrop">
            <div className="modalCard">
              <h2 style={{ marginTop: 0 }}>Add New Account</h2>
              <form onSubmit={handleCreate}>
                <div className="formGroup" style={{ marginBottom: 12 }}>
                  <label>Account Name *</label>
                  <input
                    type="text"
                    required
                    className="formControl"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Office Equipment"
                  />
                </div>
                <div className="formGroup" style={{ marginBottom: 12 }}>
                  <label>Account Type *</label>
                  <select
                    className="formControl"
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                  >
                    <option value="ASSET">Asset</option>
                    <option value="LIABILITY">Liability</option>
                    <option value="CAPITAL">Capital</option>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                  </select>
                </div>
                <div className="formGroup" style={{ marginBottom: 20 }}>
                  <label>Subtype</label>
                  <input
                    type="text"
                    className="formControl"
                    value={formData.account_subtype}
                    onChange={(e) => setFormData({ ...formData, account_subtype: e.target.value })}
                    placeholder="Current Asset / Fixed Asset"
                  />
                </div>
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btnSecondary">Cancel</button>
                  <button type="submit" className="btnPrimary">Create Account</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
