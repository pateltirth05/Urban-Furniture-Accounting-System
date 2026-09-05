import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API } from "../../services/api";

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    product_type: "GOODS",
    sales_price: 0,
    cost_price: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    API.getProductCategories()
      .then((res) => setCategories(res.data.data))
      .catch(console.error);

    if (isEdit) {
      API.getProduct(id)
        .then((res) => setFormData(res.data.data))
        .catch(() => setError("Failed to load product data"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (isEdit) {
        await API.updateProduct(id, formData);
      } else {
        await API.createProduct(formData);
      }
      navigate("/products");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="pageWorkspace">Loading product...</div>;

  return (
    <div className="pageWorkspace">
      <div className="pageCard" style={{ maxWidth: 650, margin: "0 auto" }}>
        <div className="pageHeader">
          <h1 className="pageTitle">{isEdit ? "Edit Product" : "New Product"}</h1>
          <button onClick={() => navigate("/products")} className="btnSecondary">
            Back to Products
          </button>
        </div>

        {error && <div className="errorText" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="formGrid">
            <div className="formGroup" style={{ gridColumn: "1 / -1" }}>
              <label>Product Name *</label>
              <input
                type="text"
                name="name"
                required
                className="formControl"
                value={formData.name || ""}
                onChange={handleChange}
                placeholder="e.g. Modern Teak Park Bench"
              />
            </div>

            <div className="formGroup">
              <label>Category</label>
              <select
                name="category_id"
                className="formControl"
                value={formData.category_id || ""}
                onChange={handleChange}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="formGroup">
              <label>Product Type *</label>
              <select
                name="product_type"
                className="formControl"
                value={formData.product_type || "GOODS"}
                onChange={handleChange}
              >
                <option value="GOODS">Goods (Inventory Tracked)</option>
                <option value="SERVICE">Service</option>
                <option value="COMBO">Combo</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Sales Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="sales_price"
                required
                className="formControl"
                value={formData.sales_price ?? 0}
                onChange={handleChange}
              />
            </div>

            <div className="formGroup">
              <label>Cost Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="cost_price"
                required
                className="formControl"
                value={formData.cost_price ?? 0}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => navigate("/products")} className="btnSecondary">
              Cancel
            </button>
            <button type="submit" className="btnPrimary" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
