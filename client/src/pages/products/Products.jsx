import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import Pagination from "../../components/Pagination";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await API.getProductCategories();
      setCategories(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const res = await API.getProducts({
        page,
        pageSize: 20,
        search,
        category_id: categoryFilter,
        product_type: typeFilter,
      });
      setProducts(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts(1);
  }, [categoryFilter, typeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts(1);
  };

  const handleArchive = async (id) => {
    if (!window.confirm("Are you sure you want to archive this product?")) return;
    try {
      await API.archiveProduct(id);
      fetchProducts(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to archive product");
    }
  };

  return (
    <div className="pageWorkspace">
      <div className="pageCard">
        <div className="pageHeader">
          <h1 className="pageTitle">Product Catalog</h1>
          <div className="actionRow">
            <a href={API.exportCsvUrl("products")} className="btnSecondary">Export CSV</a>
            <Link to="/products/categories" className="btnSecondary">Manage Categories</Link>
            <Link to="/products/new" className="btnPrimary">+ Create Product</Link>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="filterBar">
          <input
            type="text"
            className="searchBox"
            placeholder="Search products by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btnSecondary">Search</button>

          <select
            className="filterSelect"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            className="filterSelect"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Product Types</option>
            <option value="GOODS">Goods</option>
            <option value="SERVICE">Service</option>
            <option value="COMBO">Combo</option>
          </select>
        </form>

        {loading ? (
          <LoadingState message="Fetching products..." />
        ) : error ? (
          <ErrorState message="Failed to load products" onRetry={() => fetchProducts(pagination.page)} />
        ) : products.length === 0 ? (
          <EmptyState message="No products found." />
        ) : (
          <div className="tableContainer">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Sales Price</th>
                  <th>Cost Price</th>
                  <th>Stock On Hand</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.category_name || "Uncategorized"}</td>
                    <td>
                      <span className="statusBadge statusConfirmed">{p.product_type}</span>
                    </td>
                    <td>₹{Number(p.sales_price).toFixed(2)}</td>
                    <td>₹{Number(p.cost_price).toFixed(2)}</td>
                    <td>
                      {p.product_type === "GOODS" ? (
                        <strong style={{ color: Number(p.current_stock) > 0 ? "var(--ufSuccess)" : "var(--ufDanger)" }}>
                          {p.current_stock}
                        </strong>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Link to={`/products/${p.id}/edit`} className="btnSecondary" style={{ padding: "4px 8px", fontSize: 12 }}>
                          Edit
                        </Link>
                        <button
                          onClick={() => handleArchive(p.id)}
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
            <Pagination pagination={pagination} onPageChange={fetchProducts} />
          </div>
        )}
      </div>
    </div>
  );
}
