import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import Pagination from "../../components/Pagination";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchPayments = async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const res = await API.getPayments({ page, pageSize: 20, search, payment_type: typeFilter });
      setPayments(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(1);
  }, [typeFilter]);

  return (
    <div className="pageWorkspace">
      <div className="pageCard">
        <div className="pageHeader">
          <h1 className="pageTitle">Payments Settlement Ledger</h1>
          <Link to="/payments/new" className="btnPrimary">+ Register Payment</Link>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); fetchPayments(1); }} className="filterBar">
          <input
            type="text"
            className="searchBox"
            placeholder="Search Payment #, reference or partner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btnSecondary">Search</button>

          <select
            className="filterSelect"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Payment Types</option>
            <option value="RECEIVE">Customer Collections (Receive)</option>
            <option value="SEND">Vendor Payments (Send)</option>
          </select>
        </form>

        {loading ? (
          <LoadingState message="Fetching payments..." />
        ) : error ? (
          <ErrorState message="Failed to load payments" onRetry={() => fetchPayments(pagination.page)} />
        ) : payments.length === 0 ? (
          <EmptyState message="No payments recorded." />
        ) : (
          <div className="tableContainer">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Payment #</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Partner</th>
                  <th>Method</th>
                  <th>Linked Document</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.payment_number}</strong></td>
                    <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                    <td>
                      <span className={`statusBadge ${p.payment_type === "RECEIVE" ? "statusPaid" : "statusCancelled"}`}>
                        {p.payment_type}
                      </span>
                    </td>
                    <td>{p.partner_name}</td>
                    <td>{p.payment_method}</td>
                    <td>{p.invoice_number ? `Inv: ${p.invoice_number}` : p.bill_number ? `Bill: ${p.bill_number}` : "—"}</td>
                    <td><strong>₹{Number(p.amount).toFixed(2)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination pagination={pagination} onPageChange={fetchPayments} />
          </div>
        )}
      </div>
    </div>
  );
}
