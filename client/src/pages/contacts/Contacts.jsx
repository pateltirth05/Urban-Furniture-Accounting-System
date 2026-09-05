import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import Pagination from "../../components/Pagination";

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchContacts = async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const res = await API.getContacts({ page, pageSize: 20, search, type: typeFilter });
      setContacts(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts(1);
  }, [typeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchContacts(1);
  };

  const handleArchive = async (id) => {
    if (!window.confirm("Are you sure you want to archive this contact?")) return;
    try {
      await API.archiveContact(id);
      fetchContacts(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to archive contact");
    }
  };

  return (
    <div className="pageWorkspace">
      <div className="pageCard">
        <div className="pageHeader">
          <h1 className="pageTitle">Contacts Directory</h1>
          <div className="actionRow">
            <a href={API.exportCsvUrl("contacts")} className="btnSecondary">Export CSV</a>
            <Link to="/contacts/new" className="btnPrimary">+ Create Contact</Link>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="filterBar">
          <input
            type="text"
            className="searchBox"
            placeholder="Search contacts by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btnSecondary">Search</button>

          <select
            className="filterSelect"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Partner Types</option>
            <option value="CUSTOMER">Customers</option>
            <option value="VENDOR">Vendors</option>
            <option value="BOTH">Both</option>
          </select>
        </form>

        {loading ? (
          <LoadingState message="Fetching contacts..." />
        ) : error ? (
          <ErrorState message="Failed to load contacts" onRetry={() => fetchContacts(pagination.page)} />
        ) : contacts.length === 0 ? (
          <EmptyState message="No contacts found." />
        ) : (
          <div className="tableContainer">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>City</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td>
                      <span className="statusBadge statusConfirmed">{c.type}</span>
                    </td>
                    <td>{c.email || "—"}</td>
                    <td>{c.mobile || "—"}</td>
                    <td>{c.city || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Link to={`/contacts/${c.id}/edit`} className="btnSecondary" style={{ padding: "4px 8px", fontSize: 12 }}>
                          Edit
                        </Link>
                        <button
                          onClick={() => handleArchive(c.id)}
                          className="btnDanger"
                          style={{ padding: "4px 8px", fontSize: 12 }}
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination pagination={pagination} onPageChange={fetchContacts} />
          </div>
        )}
      </div>
    </div>
  );
}
