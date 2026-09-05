import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import StatusBadge from "../../components/StatusBadge";

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const res = await API.getBudgets();
      setBudgets(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleConfirm = async (id) => {
    try {
      await API.confirmBudget(id);
      fetchBudgets();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to confirm budget");
    }
  };

  return (
    <div className="pageWorkspace">
      <div className="pageCard">
        <div className="pageHeader">
          <h1 className="pageTitle">Budgets Management</h1>
          <Link to="/analytics/budgets/new" className="btnPrimary">+ Create Budget Plan</Link>
        </div>

        {loading ? (
          <LoadingState message="Loading budgets..." />
        ) : (
          <table className="dataTable">
            <thead>
              <tr>
                <th>Budget Name</th>
                <th>Period</th>
                <th>Responsible</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.name}</strong></td>
                  <td>{new Date(b.start_date).toLocaleDateString()} to {new Date(b.end_date).toLocaleDateString()}</td>
                  <td>{b.responsible_name || "—"}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Link to={`/analytics/budgets/${b.id}/report`} className="btnPrimary" style={{ padding: "4px 8px", fontSize: 12 }}>
                        View Achievement Report
                      </Link>
                      {b.status === "DRAFT" && (
                        <button onClick={() => handleConfirm(b.id)} className="btnSuccess" style={{ padding: "4px 8px", fontSize: 12 }}>
                          Confirm
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
