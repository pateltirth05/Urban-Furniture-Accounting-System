import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import StatusBadge from "../../components/StatusBadge";
import Pagination from "../../components/Pagination";

export default function CustomerInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchInvoices = async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const res = await API.getCustomerInvoices({ page, pageSize: 20, search, status: statusFilter });
      setInvoices(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(1);
  }, [statusFilter]);

  const handleConfirm = async (id) => {
    if (!window.confirm("Confirming this invoice will post accounting entry & log Stock OUT for GOODS. Proceed?")) return;
    try {
      await API.confirmCustomerInvoice(id);
      fetchInvoices(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to confirm invoice");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this invoice?")) return;
    try {
      await API.cancelCustomerInvoice(id);
      fetchInvoices(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel invoice");
    }
  };

  return (
    <div className="pageWorkspace">
      <div className="pageCard">
        <div className="pageHeader">
          <h1 className="pageTitle">Customer Invoices</h1>
          <div className="actionRow">
            <a href={API.exportCsvUrl("invoices")} className="btnSecondary">Export CSV</a>
            <Link to="/sales/invoices/new" className="btnPrimary">+ Create Invoice</Link>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); fetchInvoices(1); }} className="filterBar">
          <input
            type="text"
            className="searchBox"
            placeholder="Search Invoice #, reference or customer..."
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
          <LoadingState message="Fetching customer invoices..." />
        ) : error ? (
          <ErrorState message="Failed to load customer invoices" onRetry={() => fetchInvoices(pagination.page)} />
        ) : invoices.length === 0 ? (
          <EmptyState message="No customer invoices found." />
        ) : (
          <div className="tableContainer">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Invoice Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Total Amount</th>
                  <th>Amount Due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <Link to={`/sales/invoices/${inv.id}`}>
                        <strong>{inv.invoice_number}</strong>
                      </Link>
                    </td>
                    <td>{inv.customer_name}</td>
                    <td>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                    <td>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}</td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td>₹{Number(inv.total_amount).toFixed(2)}</td>
                    <td>₹{Number(inv.amount_due).toFixed(2)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link to={`/sales/invoices/${inv.id}`} className="btnSecondary" style={{ padding: "4px 8px", fontSize: 12 }}>
                          View
                        </Link>

                        {inv.status === "DRAFT" && (
                          <>
                            <button onClick={() => handleConfirm(inv.id)} className="btnSuccess" style={{ padding: "4px 8px", fontSize: 12 }}>
                              Confirm
                            </button>
                            <button onClick={() => handleCancel(inv.id)} className="btnDanger" style={{ padding: "4px 8px", fontSize: 12 }}>
                              Cancel
                            </button>
                          </>
                        )}

                        {(inv.status === "CONFIRMED" || inv.status === "PARTIALLY_PAID") && (
                          <Link to={`/payments/new?invoice_id=${inv.id}`} className="btnPrimary" style={{ padding: "4px 8px", fontSize: 12 }}>
                            Register Payment
                          </Link>
                        )}

                        <a
                          href={API.exportInvoicePdfUrl(inv.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="btnSecondary"
                          style={{ padding: "4px 8px", fontSize: 12 }}
                        >
                          Print PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination pagination={pagination} onPageChange={fetchInvoices} />
          </div>
        )}
      </div>
    </div>
  );
}
