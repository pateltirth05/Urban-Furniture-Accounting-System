import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../../services/api";

export default function SalesOrderForm() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState([]);

  const [customerId, setCustomerId] = useState("");
  const [soDate, setSoDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentTerms, setPaymentTerms] = useState("Immediate");

  const [lines, setLines] = useState([
    { product_id: "", quantity: 1, unit_price: 0, tax_rate: 18, analytic_account_id: "" },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      API.getContacts({ type: "CUSTOMER", pageSize: 100 }),
      API.getProducts({ pageSize: 100 }),
      API.getAnalyticAccounts(),
    ]).then(([cRes, pRes, aRes]) => {
      setCustomers(cRes.data.data);
      setProducts(pRes.data.data);
      setAnalytics(aRes.data.data);
      if (cRes.data.data.length > 0) setCustomerId(cRes.data.data[0].id);
    });
  }, []);

  const handleProductSelect = (index, productId) => {
    const newLines = [...lines];
    newLines[index].product_id = productId;
    const prod = products.find((p) => String(p.id) === String(productId));
    if (prod) {
      newLines[index].unit_price = Number(prod.sales_price) || 0;
    }
    setLines(newLines);
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { product_id: "", quantity: 1, unit_price: 0, tax_rate: 18, analytic_account_id: "" }]);
  };

  const removeLine = (index) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const subtotal = lines.reduce((acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0);
  const taxTotal = lines.reduce((acc, l) => {
    const lSub = (Number(l.quantity) || 0) * (Number(l.unit_price) || 0);
    return acc + lSub * ((Number(l.tax_rate) || 0) / 100);
  }, 0);
  const grandTotal = subtotal + taxTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!customerId) return setError("Select a customer");
    if (lines.some((l) => !l.product_id || l.quantity <= 0)) return setError("Complete all product lines");

    setSaving(true);
    try {
      await API.createSalesOrder({
        customer_id: customerId,
        so_date: soDate,
        payment_terms: paymentTerms,
        lines,
      });
      navigate("/sales/orders");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create SO");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pageWorkspace">
      <div className="pageCard">
        <div className="pageHeader">
          <h1 className="pageTitle">New Sales Order</h1>
          <button onClick={() => navigate("/sales/orders")} className="btnSecondary">Cancel</button>
        </div>

        {error && <div className="errorText" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="formGrid">
            <div className="formGroup">
              <label>Customer *</label>
              <select className="formControl" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="formGroup">
              <label>Order Date *</label>
              <input type="date" className="formControl" value={soDate} onChange={(e) => setSoDate(e.target.value)} required />
            </div>

            <div className="formGroup">
              <label>Payment Terms</label>
              <input type="text" className="formControl" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Immediate / Net 30" />
            </div>
          </div>

          <h3>Sales Line Items</h3>
          <table className="lineItemsTable">
            <thead>
              <tr>
                <th>Product *</th>
                <th>Quantity *</th>
                <th>Sales Price (₹)</th>
                <th>Tax %</th>
                <th>Analytic Account</th>
                <th>Line Total (₹)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const lSub = (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);
                const lTax = lSub * ((Number(line.tax_rate) || 0) / 100);
                const lineTotal = lSub + lTax;
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
                        min="0"
                        max="100"
                        className="formControl"
                        value={line.tax_rate}
                        onChange={(e) => handleLineChange(idx, "tax_rate", e.target.value)}
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
            <button type="button" onClick={() => navigate("/sales/orders")} className="btnSecondary">Cancel</button>
            <button type="submit" className="btnPrimary" disabled={saving}>
              {saving ? "Saving..." : "Save SO Draft"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
