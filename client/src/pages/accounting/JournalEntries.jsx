import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import StatusBadge from "../../components/StatusBadge";
import Pagination from "../../components/Pagination";

export default function JournalEntries() {
  const [entries, setEntries] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchEntries = async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const res = await API.getJournalEntries({ page, pageSize: 20, search, status: statusFilter });
      setEntries(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries(1);
  }, [statusFilter]);

  const handlePost = async (id) => {
    if (!window.confirm("Confirm posting this journal entry? Debit must equal Credit.")) return;
    try {
      await API.postJournalEntry(id);
      fetchEntries(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to post entry");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this journal entry?")) return;
    try {
      await API.cancelJournalEntry(id);
      fetchEntries(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel entry");
    }
  };

  return (
    <div className="pageWorkspace">
      <div className="pageCard">
        <div className="pageHeader">
          <h1 className="pageTitle">Journal Entries</h1>
          <Link to="/accounting/journal-entries/new" className="btnPrimary">+ Create Journal Entry</Link>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); fetchEntries(1); }} className="filterBar">
          <input
            type="text"
            className="searchBox"
            placeholder="Search by entry # or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btnSecondary">Search</button>

          <select
            className="filterSelect"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="POSTED">Posted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </form>

        {loading ? (
          <LoadingState message="Fetching journal entries..." />
        ) : error ? (
          <ErrorState message="Failed to load journal entries" onRetry={() => fetchEntries(pagination.page)} />
        ) : entries.length === 0 ? (
          <EmptyState message="No journal entries found." />
        ) : (
          <div className="tableContainer">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Entry #</th>
                  <th>Date</th>
                  <th>Journal</th>
                  <th>Reference / Partner</th>
                  <th>Status</th>
                  <th>Total Debit</th>
                  <th>Total Credit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((je) => (
                  <tr key={je.id}>
                    <td><strong>{je.entry_number}</strong></td>
                    <td>{new Date(je.entry_date).toLocaleDateString()}</td>
                    <td>{je.journal_name}</td>
                    <td>{je.reference || je.partner_name || "—"}</td>
                    <td><StatusBadge status={je.status} /></td>
                    <td>₹{Number(je.total_debit).toFixed(2)}</td>
                    <td>₹{Number(je.total_credit).toFixed(2)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {je.status === "DRAFT" && (
                          <>
                            <button onClick={() => handlePost(je.id)} className="btnSuccess" style={{ padding: "4px 8px", fontSize: 12 }}>
                              Post
                            </button>
                            <button onClick={() => handleCancel(je.id)} className="btnDanger" style={{ padding: "4px 8px", fontSize: 12 }}>
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination pagination={pagination} onPageChange={fetchEntries} />
          </div>
        )}
      </div>
    </div>
  );
}
