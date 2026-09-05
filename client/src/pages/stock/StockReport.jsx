import { useEffect, useState } from "react";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";

export default function StockReport() {
  const [stock, setStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [activeTab, setActiveTab] = useState("levels");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchStock = async () => {
    setLoading(true);
    setError(false);
    try {
      if (activeTab === "levels") {
        const res = await API.getStockReport({ search });
        setStock(res.data.data);
      } else {
        const res = await API.getStockMovements();
        setMovements(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, [activeTab]);

  return (
    <div className="pageWorkspace">
      <div className="pageCard">
        <div className="pageHeader">
          <h1 className="pageTitle">Inventory & Stock Ledger</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={activeTab === "levels" ? "btnPrimary" : "btnSecondary"}
              onClick={() => setActiveTab("levels")}
            >
              Current Stock Levels
            </button>
            <button
              className={activeTab === "movements" ? "btnPrimary" : "btnSecondary"}
              onClick={() => setActiveTab("movements")}
            >
              Stock Movements Log
            </button>
          </div>
        </div>

        {activeTab === "levels" && (
          <form onSubmit={(e) => { e.preventDefault(); fetchStock(); }} className="filterBar">
            <input
              type="text"
              className="searchBox"
              placeholder="Search product inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btnSecondary">Search</button>
          </form>
        )}

        {loading ? (
          <LoadingState message="Loading inventory records..." />
        ) : error ? (
          <ErrorState message="Failed to load inventory data" onRetry={fetchStock} />
        ) : activeTab === "levels" ? (
          stock.length === 0 ? (
            <EmptyState message="No inventory records found." />
          ) : (
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Total Purchased (IN)</th>
                  <th>Total Sold (OUT)</th>
                  <th>Current Stock On Hand</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.name}</strong></td>
                    <td>{item.category_name || "Uncategorized"}</td>
                    <td>{item.total_in}</td>
                    <td>{item.total_out}</td>
                    <td>
                      <strong style={{ color: Number(item.current_stock) > 0 ? "var(--ufSuccess)" : "var(--ufDanger)", fontSize: 16 }}>
                        {item.current_stock}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          movements.length === 0 ? (
            <EmptyState message="No stock movements logged." />
          ) : (
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Movement Type</th>
                  <th>Quantity</th>
                  <th>Reference Document</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.movement_date).toLocaleDateString()}</td>
                    <td><strong>{m.product_name}</strong></td>
                    <td>
                      <span className={`statusBadge ${m.movement_type === "IN" ? "statusPaid" : "statusCancelled"}`}>
                        {m.movement_type}
                      </span>
                    </td>
                    <td><strong>{m.quantity}</strong></td>
                    <td>{m.reference_type} #{m.reference_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
