import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API } from "../../services/api";

export default function VendorBillForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const poId = searchParams.get("po_id");

  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [analytics, setAnalytics] = useState([]);

  const [vendorId, setVendorId] = useState("");
  const [billReference, setBillReference] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");

  const [lines, setLines] = useState([
    { product_id: "", account_id: "", quantity: 1, unit_price: 0, tax_amount: 0, analytic_account_id: "" },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      API.getContacts({ type: "VENDOR", pageSize: 100 }),
      API.getProducts({ pageSize: 100 }),
      API.getAccounts(),
      API.getAnalyticAccounts(),
    ]).then(([vRes, pRes, aRes, anRes]) => {
      setVendors(vRes.data.data);
      setProducts(pRes.data.data);
      setAccounts(aRes.data.data);
      setAnalytics(anRes.data.data);

      if (poId) {
        API.getPurchaseOrder(poId).then((poRes) => {
          const po = poRes.data.data;
          setVendorId(po.vendor_id);
          setBillReference(`PO Ref: ${po.po_number}`);
          if (po.lines && po.lines.length > 0) {
            setLines(
              po.lines.map((l) => ({
                product_id: l.product_id,
                account_id: "",
                quantity: l.quantity,
                unit_price: l.unit_price,
                tax_amount: l.tax_amount,
                analytic_account_id: l.analytic_account_id || "",
              }))
            );
          }
        });
      }
    });
  }, [poId]);

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
    setLines([...lines, { product_id: "", account_id: "", quantity: 1, unit_price: 0, tax_amount: 0, analytic_account_id: "" }]);
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
      await API.createVendorBill({
        purchase_order_id: poId || null,
        vendor_id: vendorId,
        bill_reference: billReference,
        bill_date: billDate,
        due_date: dueDate || null,
        lines,
      });
      navigate("/purchases/bills");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create vendor bill");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pageWorkspace">
      <div className="pageCard">
        <div className="pageHeader">
          <h1 className="pageTitle">New Vendor Bill</h1>
          <button onClick={() => navigate("/purchases/bills")} className="btnSecondary">Cancel</button>
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
              <label>Bill Reference / Vendor Inv #</label>
              <input type="text" className="formControl" value={billReference} onChange={(e) => setBillReference(e.target.value)} placeholder="e.g. INV-9988" />
            </div>

            <div className="formGroup">
              <label>Bill Date *</label>
              <input type="date" className="formControl" value={billDate} onChange={(e) => setBillDate(e.target.value)} required />
            </div>

            <div className="formGroup">
              <label>Due Date</label>
              <input type="date" className="formControl" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <h3>Bill Line Items</h3>
          <table className="lineItemsTable">
            <thead>
              <tr>
                <th>Product *</th>
                <th>Expense Account</th>
                <th>Quantity *</th>
                <th>Unit Price (₹)</th>
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
                      <select
                        className="formControl"
                        value={line.account_id}
                        onChange={(e) => handleLineChange(idx, "account_id", e.target.value)}
                      >
                        <option value="">Default Expense</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
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
            + Add Line Row
          </button>

          <div style={{ background: "#f8f9fa", padding: 16, borderRadius: 6, marginBottom: 20, textAlign: "right" }}>
            <div>Subtotal: ₹{subtotal.toFixed(2)}</div>
            <div>Tax Total: ₹{taxTotal.toFixed(2)}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ufPrimary)", marginTop: 6 }}>
              Grand Total: ₹{grandTotal.toFixed(2)}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => navigate("/purchases/bills")} className="btnSecondary">Cancel</button>
            <button type="submit" className="btnPrimary" disabled={saving}>
              {saving ? "Saving..." : "Save Draft Bill"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
