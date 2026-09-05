import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import Pagination from "../../components/Pagination";

export default function CustomerPortal() {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchMyInvoices = async (page = 1) => {
    setLoading(true);
    try {
      const res = await API.getCustomerInvoices({ page, pageSize: 20 });
      setInvoices(res.data.data);
      setPagination(res.data.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyInvoices(1);
  }, []);

  return (
    <div className="pageWorkspace">
      <div className="pageCard" style={{ maxWidth: 900, margin: "0 auto" }}>
        <div className="pageHeader">
          <h1 className="pageTitle">My Account & Invoices Portal</h1>
        </div>

        <p style={{ color: "var(--ufTextMuted)" }}>
          Welcome to your customer portal. Here you can review all invoices issued to your organization, track payment statuses, and print copies.
        </p>

        {loading ? (
          <LoadingState message="Fetching your account invoices..." />
        ) : invoices.length === 0 ? (
          <EmptyState message="No invoices found for your account." />
        ) : (
          <div className="tableContainer" style={{ marginTop: 20 }}>
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
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
                    <td><strong>{inv.invoice_number}</strong></td>
                    <td>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                    <td>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}</td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td>₹{Number(inv.total_amount).toFixed(2)}</td>
                    <td><strong style={{ color: Number(inv.amount_due) > 0 ? "var(--ufDanger)" : "var(--ufSuccess)" }}>₹{Number(inv.amount_due).toFixed(2)}</strong></td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link to={`/portal/bills/${inv.id}`} className="btnSecondary" style={{ padding: "4px 8px", fontSize: 12 }}>
                          View Invoice
                        </Link>
                        <a
                          href={API.exportInvoicePdfUrl(inv.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="btnPrimary"
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
            <Pagination pagination={pagination} onPageChange={fetchMyInvoices} />
          </div>
        )}
      </div>
    </div>
  );
}
