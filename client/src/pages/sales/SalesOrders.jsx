import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import StatusBadge from "../../components/StatusBadge";
import Pagination from "../../components/Pagination";

export default function SalesOrders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchOrders = async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const res = await API.getSalesOrders({ page, pageSize: 20, search, status: statusFilter });
      setOrders(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, [statusFilter]);

  const handleConfirm = async (id) => {
    try {
      await API.confirmSalesOrder(id);
      fetchOrders(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to confirm SO");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this sales order?")) return;
    try {
      await API.cancelSalesOrder(id);
      fetchOrders(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel SO");
    }
  };

  return (
    <div className="pageWorkspace">
      <div className="pageCard">
        <div className="pageHeader">
          <h1 className="pageTitle">Sales Orders</h1>
          <Link to="/sales/orders/new" className="btnPrimary">+ Create Sales Order</Link>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); fetchOrders(1); }} className="filterBar">
          <input
            type="text"
            className="searchBox"
            placeholder="Search SO # or customer..."
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
            <option value="INVOICED">Invoiced</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </form>

        {loading ? (
          <LoadingState message="Fetching sales orders..." />
        ) : error ? (
          <ErrorState message="Failed to load sales orders" onRetry={() => fetchOrders(pagination.page)} />
        ) : orders.length === 0 ? (
          <EmptyState message="No sales orders found." />
        ) : (
          <div className="tableContainer">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>SO #</th>
                  <th>Customer</th>
                  <th>Order Date</th>
                  <th>Status</th>
                  <th>Total Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((so) => (
                  <tr key={so.id}>
                    <td><strong>{so.so_number}</strong></td>
                    <td>{so.customer_name}</td>
                    <td>{new Date(so.so_date).toLocaleDateString()}</td>
                    <td><StatusBadge status={so.status} /></td>
                    <td>₹{Number(so.total_amount).toFixed(2)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {so.status === "DRAFT" && (
                          <button onClick={() => handleConfirm(so.id)} className="btnSuccess" style={{ padding: "4px 8px", fontSize: 12 }}>
                            Confirm
                          </button>
                        )}
                        {so.status === "CONFIRMED" && (
                          <Link to={`/sales/invoices/new?so_id=${so.id}`} className="btnPrimary" style={{ padding: "4px 8px", fontSize: 12 }}>
                            Create Invoice
                          </Link>
                        )}
                        {so.status !== "CANCELLED" && so.status !== "INVOICED" && (
                          <button onClick={() => handleCancel(so.id)} className="btnDanger" style={{ padding: "4px 8px", fontSize: 12 }}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination pagination={pagination} onPageChange={fetchOrders} />
          </div>
        )}
      </div>
    </div>
  );
}
