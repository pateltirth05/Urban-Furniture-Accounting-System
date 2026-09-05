import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import ErrorState from "../../components/ErrorState";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadSummary = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await API.getDashboardSummary();
      setSummary(res.data.data);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  if (loading) return <LoadingState message="Loading dashboard financial KPIs..." />;
  if (error) return <ErrorState message="Failed to load dashboard summary" onRetry={loadSummary} />;

  return (
    <div className="pageWorkspace">
      <div className="pageHeader">
        <h1 className="pageTitle">Executive Overview Dashboard</h1>
        <div className="actionRow">
          <Link to="/sales/orders/new" className="btnPrimary">+ New Sales Order</Link>
          <Link to="/purchases/orders/new" className="btnSecondary">+ New Purchase Order</Link>
        </div>
      </div>

      <div className="kpiGrid">
        <div className="kpiCard">
          <div className="kpiTitle">Total Sales Invoiced</div>
          <div className="kpiValue">₹{(summary?.totalSales || 0).toLocaleString()}</div>
        </div>

        <div className="kpiCard">
          <div className="kpiTitle">Total Vendor Billed</div>
          <div className="kpiValue" style={{ color: "#d9534f" }}>₹{(summary?.totalPurchases || 0).toLocaleString()}</div>
        </div>

        <div className="kpiCard">
          <div className="kpiTitle">Net Accounting Profit</div>
          <div className="kpiValue" style={{ color: (summary?.netProfit || 0) >= 0 ? "var(--ufSuccess)" : "var(--ufDanger)" }}>
            ₹{(summary?.netProfit || 0).toLocaleString()}
          </div>
        </div>

        <div className="kpiCard">
          <div className="kpiTitle">Receivables (Pending Invoices)</div>
          <div className="kpiValue" style={{ color: "#f0ad4e" }}>₹{(summary?.pendingInvoices || 0).toLocaleString()}</div>
        </div>

        <div className="kpiCard">
          <div className="kpiTitle">Payables (Pending Bills)</div>
          <div className="kpiValue" style={{ color: "#d9534f" }}>₹{(summary?.pendingBills || 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="pageCard" style={{ marginTop: 24 }}>
        <h3 style={{ marginTop: 0, color: "var(--ufPrimary)" }}>Quick ERP Actions & Shortcuts</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link to="/contacts" className="btnSecondary">Manage Contacts</Link>
          <Link to="/products" className="btnSecondary">Product Catalog</Link>
          <Link to="/accounting/journal-entries" className="btnSecondary">Journal Entries</Link>
          <Link to="/reports/profit-and-loss" className="btnSecondary">P&L Statement</Link>
          <Link to="/reports/balance-sheet" className="btnSecondary">Balance Sheet</Link>
          <Link to="/stock" className="btnSecondary">Stock Inventory</Link>
        </div>
      </div>
    </div>
  );
}
