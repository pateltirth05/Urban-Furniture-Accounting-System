import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import StatusBadge from "../../components/StatusBadge";
import Pagination from "../../components/Pagination";

export default function VendorBills() {
  const [bills, setBills] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchBills = async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const res = await API.getVendorBills({ page, pageSize: 20, search, status: statusFilter });
      setBills(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills(1);
  }, [statusFilter]);

  const handleConfirm = async (id) => {
    if (!window.confirm("Confirming this bill will generate accounting entries and Stock IN movements for GOODS. Proceed?")) return;
    try {
      await API.confirmVendorBill(id);
      fetchBills(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to confirm bill");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this bill?")) return;
    try {
      await API.cancelVendorBill(id);
      fetchBills(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel bill");
    }
  };

  return (
    <div className="pageWorkspace">
      <div className="pageCard">
        <div className="pageHeader">
          <h1 className="pageTitle">Vendor Bills</h1>
          <div className="actionRow">
            <a href={API.exportCsvUrl("bills")} className="btnSecondary">Export CSV</a>
            <Link to="/purchases/bills/new" className="btnPrimary">+ Create Vendor Bill</Link>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); fetchBills(1); }} className="filterBar">
          <input
            type="text"
            className="searchBox"
            placeholder="Search Bill #, reference or vendor..."
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
            <option value="CONFIRMED">Confirmed</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </form>

        {loading ? (
          <LoadingState message="Fetching vendor bills..." />
        ) : error ? (
          <ErrorState message="Failed to load vendor bills" onRetry={() => fetchBills(pagination.page)} />
        ) : bills.length === 0 ? (
          <EmptyState message="No vendor bills found." />
        ) : (
          <div className="tableContainer">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Bill #</th>
                  <th>Vendor</th>
                  <th>Bill Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Total Amount</th>
                  <th>Amount Due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.bill_number}</strong></td>
                    <td>{b.vendor_name}</td>
                    <td>{new Date(b.bill_date).toLocaleDateString()}</td>
                    <td>{b.due_date ? new Date(b.due_date).toLocaleDateString() : "—"}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td>₹{Number(b.total_amount).toFixed(2)}</td>
                    <td>₹{Number(b.amount_due).toFixed(2)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {b.status === "DRAFT" && (
                          <>
                            <button onClick={() => handleConfirm(b.id)} className="btnSuccess" style={{ padding: "4px 8px", fontSize: 12 }}>
                              Confirm
                            </button>
                            <button onClick={() => handleCancel(b.id)} className="btnDanger" style={{ padding: "4px 8px", fontSize: 12 }}>
                              Cancel
                            </button>
                          </>
                        )}
                        {(b.status === "CONFIRMED" || b.status === "PARTIALLY_PAID") && (
                          <Link to={`/payments/new?bill_id=${b.id}`} className="btnPrimary" style={{ padding: "4px 8px", fontSize: 12 }}>
                            Register Payment
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination pagination={pagination} onPageChange={fetchBills} />
          </div>
        )}
      </div>
    </div>
  );
}
