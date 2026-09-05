import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../../services/api";

export default function PurchaseOrderForm() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState([]);

  const [vendorId, setVendorId] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentTerms, setPaymentTerms] = useState("Net 30");

  const [lines, setLines] = useState([
    { product_id: "", quantity: 1, unit_price: 0, tax_amount: 0, analytic_account_id: "" },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      API.getContacts({ type: "VENDOR", pageSize: 100 }),
      API.getProducts({ pageSize: 100 }),
      API.getAnalyticAccounts(),
    ]).then(([vRes, pRes, aRes]) => {
      setVendors(vRes.data.data);
      setProducts(pRes.data.data);
      setAnalytics(aRes.data.data);
      if (vRes.data.data.length > 0) setVendorId(vRes.data.data[0].id);
    });
  }, []);

  const handleProductSelect = (index, productId) => {
    const newLines = [...lines];
    newLines[index].product_id = productId;
    const prod = products.find((p) => String(p.id) === String(productId));
    if (prod) {
      newLines[index].unit_price = Number(prod.cost_price) || 0;
      newLines[index].tax_amount = (Number(prod.cost_price) || 0) * 0.18;
    }
    setLines(newLines);
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { product_id: "", quantity: 1, unit_price: 0, tax_amount: 0, analytic_account_id: "" }]);
  };

  const removeLine = (index) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const subtotal = lines.reduce((acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0);
  const taxTotal = lines.reduce((acc, l) => acc + (Number(l.tax_amount) || 0), 0);
  const grandTotal = subtotal + taxTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!vendorId) return setError("Select a vendor");
    if (lines.some((l) => !l.product_id || l.quantity <= 0)) return setError("Complete all product lines");

    setSaving(true);
    try {
      await API.createPurchaseOrder({
        vendor_id: vendorId,
        po_date: poDate,
        payment_terms: paymentTerms,
        lines,
      });
      navigate("/purchases/orders");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create PO");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pageWorkspace">
      <div className="pageCard">
        <div className="pageHeader">
          <h1 className="pageTitle">New Purchase Order</h1>
          <button onClick={() => navigate("/purchases/orders")} className="btnSecondary">Cancel</button>
        </div>

        {error && <div className="errorText" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="formGrid">
            <div className="formGroup">
              <label>Vendor *</label>
              <select className="formControl" value={vendorId} onChange={(e) => setVendorId(e.target.value)} required>
                <option value="">Select Vendor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="formGroup">
              <label>Order Date *</label>
              <input type="date" className="formControl" value={poDate} onChange={(e) => setPoDate(e.target.value)} required />
            </div>

            <div className="formGroup">
              <label>Payment Terms</label>
              <input type="text" className="formControl" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Net 30 / Immediate" />
            </div>
          </div>

          <h3>Order Line Items</h3>
          <table className="lineItemsTable">
            <thead>
              <tr>
                <th>Product *</th>
                <th>Quantity *</th>
                <th>Cost Price (₹)</th>
                <th>Tax (₹)</th>
                <th>Analytic Account</th>
                <th>Line Total (₹)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const lineTotal = (Number(line.quantity) || 0) * (Number(line.unit_price) || 0) + (Number(line.tax_amount) || 0);
                return (
                  <tr key={idx}>
                    <td>
                      <select
                        className="formControl"
                        value={line.product_id}
                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                        required
                      >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.product_type})</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="formControl"
                        value={line.quantity}
                        onChange={(e) => handleLineChange(idx, "quantity", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="formControl"
                        value={line.unit_price}
                        onChange={(e) => handleLineChange(idx, "unit_price", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="formControl"
                        value={line.tax_amount}
                        onChange={(e) => handleLineChange(idx, "tax_amount", e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        className="formControl"
                        value={line.analytic_account_id}
                        onChange={(e) => handleLineChange(idx, "analytic_account_id", e.target.value)}
                      >
                        <option value="">Select Analytic</option>
                        {analytics.map((an) => (
                          <option key={an.id} value={an.id}>{an.name}</option>
                        ))}
                      </select>
                    </td>
                    <td><strong>₹{lineTotal.toFixed(2)}</strong></td>
                    <td>
                      {lines.length > 1 && (
                        <button type="button" onClick={() => removeLine(idx)} className="btnDanger" style={{ padding: "2px 6px" }}>
                          X
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <button type="button" onClick={addLine} className="btnSecondary" style={{ marginBottom: 20 }}>
            + Add Product Line
          </button>

          <div style={{ background: "#f8f9fa", padding: 16, borderRadius: 6, marginBottom: 20, textAlign: "right" }}>
            <div>Subtotal: ₹{subtotal.toFixed(2)}</div>
            <div>Tax Total: ₹{taxTotal.toFixed(2)}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ufPrimary)", marginTop: 6 }}>
              Grand Total: ₹{grandTotal.toFixed(2)}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => navigate("/purchases/orders")} className="btnSecondary">Cancel</button>
            <button type="submit" className="btnPrimary" disabled={saving}>
              {saving ? "Saving..." : "Save PO Draft"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
