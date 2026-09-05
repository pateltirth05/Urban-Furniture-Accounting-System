import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import StatusBadge from "../../components/StatusBadge";
import Pagination from "../../components/Pagination";

export default function PurchaseOrders() {
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
      const res = await API.getPurchaseOrders({ page, pageSize: 20, search, status: statusFilter });
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
      await API.confirmPurchaseOrder(id);
      fetchOrders(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to confirm PO");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this purchase order?")) return;
    try {
      await API.cancelPurchaseOrder(id);
      fetchOrders(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel PO");
    }
  };

  return (
    <div className="pageWorkspace">
      <div className="pageCard">
        <div className="pageHeader">
          <h1 className="pageTitle">Purchase Orders</h1>
          <Link to="/purchases/orders/new" className="btnPrimary">+ Create Purchase Order</Link>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); fetchOrders(1); }} className="filterBar">
          <input
            type="text"
            className="searchBox"
            placeholder="Search PO # or vendor..."
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
            <option value="BILLED">Billed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </form>

        {loading ? (
          <LoadingState message="Fetching purchase orders..." />
        ) : error ? (
          <ErrorState message="Failed to load purchase orders" onRetry={() => fetchOrders(pagination.page)} />
        ) : orders.length === 0 ? (
          <EmptyState message="No purchase orders found." />
        ) : (
          <div className="tableContainer">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>PO #</th>
                  <th>Vendor</th>
                  <th>Order Date</th>
                  <th>Status</th>
                  <th>Total Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((po) => (
                  <tr key={po.id}>
                    <td><strong>{po.po_number}</strong></td>
                    <td>{po.vendor_name}</td>
                    <td>{new Date(po.po_date).toLocaleDateString()}</td>
                    <td><StatusBadge status={po.status} /></td>
                    <td>₹{Number(po.total_amount).toFixed(2)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {po.status === "DRAFT" && (
                          <button onClick={() => handleConfirm(po.id)} className="btnSuccess" style={{ padding: "4px 8px", fontSize: 12 }}>
                            Confirm
                          </button>
                        )}
                        {po.status === "CONFIRMED" && (
                          <Link to={`/purchases/bills/new?po_id=${po.id}`} className="btnPrimary" style={{ padding: "4px 8px", fontSize: 12 }}>
                            Create Bill
                          </Link>
                        )}
                        {po.status !== "CANCELLED" && po.status !== "BILLED" && (
                          <button onClick={() => handleCancel(po.id)} className="btnDanger" style={{ padding: "4px 8px", fontSize: 12 }}>
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
