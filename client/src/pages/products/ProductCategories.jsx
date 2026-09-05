import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";

export default function ProductCategories() {
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await API.getProductCategories();
      setCategories(res.data.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load product categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await API.createProductCategory({ name: newCatName.trim() });
      setNewCatName("");
      loadCategories();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create category");
    }
  };

  return (
    <div className="pageWorkspace">
      <div className="pageCard" style={{ maxWidth: 650, margin: "0 auto" }}>
        <div className="pageHeader">
          <h1 className="pageTitle">Product Categories</h1>
          <Link to="/products" className="btnSecondary">Back to Products</Link>
        </div>

        <form onSubmit={handleCreate} style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <input
            type="text"
            className="formControl"
            style={{ flex: 1 }}
            placeholder="New Category Name..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            required
          />
          <button type="submit" className="btnPrimary">+ Add Category</button>
        </form>

        {loading ? (
          <LoadingState message="Loading categories..." />
        ) : (
          <table className="dataTable">
            <thead>
              <tr>
                <th>ID</th>
                <th>Category Name</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td><strong>{c.name}</strong></td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
