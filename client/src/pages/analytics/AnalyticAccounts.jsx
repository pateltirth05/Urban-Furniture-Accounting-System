import { useEffect, useState } from "react";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";

export default function AnalyticAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", type: "EXPENSE" });

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await API.getAnalyticAccounts();
      setAccounts(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.createAnalyticAccount(formData);
      setShowModal(false);
      setFormData({ name: "", type: "EXPENSE" });
      loadAnalytics();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create analytic account");
    }
  };

  return (
    <div className="pageWorkspace">
      <div className="pageCard">
        <div className="pageHeader">
          <h1 className="pageTitle">Analytic Cost & Revenue Centers</h1>
          <button onClick={() => setShowModal(true)} className="btnPrimary">+ Add Analytic Account</button>
        </div>

        {loading ? (
          <LoadingState message="Loading analytic accounts..." />
        ) : (
          <table className="dataTable">
            <thead>
              <tr>
                <th>ID</th>
                <th>Account Name</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td><strong>{a.name}</strong></td>
                  <td><span className="statusBadge statusConfirmed">{a.type}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showModal && (
          <div className="modalBackdrop">
            <div className="modalCard">
              <h2 style={{ marginTop: 0 }}>Add Analytic Account</h2>
              <form onSubmit={handleCreate}>
                <div className="formGroup" style={{ marginBottom: 12 }}>
                  <label>Name *</label>
                  <input
                    type="text"
                    required
                    className="formControl"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. City Beautification Project"
                  />
                </div>
                <div className="formGroup" style={{ marginBottom: 20 }}>
                  <label>Type *</label>
                  <select
                    className="formControl"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="EXPENSE">Expense Cost Center</option>
                    <option value="INCOME">Income Revenue Center</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btnSecondary">Cancel</button>
                  <button type="submit" className="btnPrimary">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
