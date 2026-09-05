import { useEffect, useState } from "react";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";

export default function Journals() {
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", journal_type: "SALES", default_account_id: "" });

  const loadData = async () => {
    setLoading(true);
    try {
      const [jRes, aRes] = await Promise.all([API.getJournals(), API.getAccounts()]);
      setJournals(jRes.data.data);
      setAccounts(aRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.createJournal(formData);
      setShowModal(false);
      setFormData({ name: "", journal_type: "SALES", default_account_id: "" });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create journal");
    }
  };

  return (
    <div className="pageWorkspace">
      <div className="pageCard">
        <div className="pageHeader">
          <h1 className="pageTitle">Journals Directory</h1>
          <button onClick={() => setShowModal(true)} className="btnPrimary">+ Add Journal</button>
        </div>

        {loading ? (
          <LoadingState message="Loading journals..." />
        ) : (
          <table className="dataTable">
            <thead>
              <tr>
                <th>ID</th>
                <th>Journal Name</th>
                <th>Type</th>
                <th>Default Account</th>
              </tr>
            </thead>
            <tbody>
              {journals.map((j) => (
                <tr key={j.id}>
                  <td>{j.id}</td>
                  <td><strong>{j.name}</strong></td>
                  <td><span className="statusBadge statusConfirmed">{j.journal_type}</span></td>
                  <td>{j.default_account_name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showModal && (
          <div className="modalBackdrop">
            <div className="modalCard">
              <h2 style={{ marginTop: 0 }}>Add New Journal</h2>
              <form onSubmit={handleCreate}>
                <div className="formGroup" style={{ marginBottom: 12 }}>
                  <label>Journal Name *</label>
                  <input
                    type="text"
                    required
                    className="formControl"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Petty Cash Journal"
                  />
                </div>
                <div className="formGroup" style={{ marginBottom: 12 }}>
                  <label>Type *</label>
                  <select
                    className="formControl"
                    value={formData.journal_type}
                    onChange={(e) => setFormData({ ...formData, journal_type: e.target.value })}
                  >
                    <option value="SALES">Sales</option>
                    <option value="PURCHASE">Purchase</option>
                    <option value="BANK">Bank</option>
                    <option value="CASH">Cash</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>
                <div className="formGroup" style={{ marginBottom: 20 }}>
                  <label>Default Account</label>
                  <select
                    className="formControl"
                    value={formData.default_account_id}
                    onChange={(e) => setFormData({ ...formData, default_account_id: e.target.value })}
                  >
                    <option value="">Select Default Account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.account_type})</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btnSecondary">Cancel</button>
                  <button type="submit" className="btnPrimary">Create Journal</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
