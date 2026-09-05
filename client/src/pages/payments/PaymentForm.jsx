import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API } from "../../services/api";

export default function PaymentForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invId = searchParams.get("invoice_id");
  const billId = searchParams.get("bill_id");

  const [paymentType, setPaymentType] = useState(invId ? "RECEIVE" : billId ? "SEND" : "RECEIVE");
  const [invoices, setInvoices] = useState([]);
  const [bills, setBills] = useState([]);

  const [selectedInvId, setSelectedInvId] = useState(invId || "");
  const [selectedBillId, setSelectedBillId] = useState(billId || "");
  const [partnerId, setPartnerId] = useState("");
  const [amount, setAmount] = useState(0);
  const [maxAmount, setMaxAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("BANK");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    API.getCustomerInvoices({ status: "CONFIRMED", pageSize: 100 }).then((res) => {
      setInvoices(res.data.data);
      if (invId) {
        const match = res.data.data.find((i) => String(i.id) === String(invId));
        if (match) {
          setPartnerId(match.customer_id);
          setAmount(Number(match.amount_due));
          setMaxAmount(Number(match.amount_due));
        }
      }
    });

    API.getVendorBills({ status: "CONFIRMED", pageSize: 100 }).then((res) => {
      setBills(res.data.data);
      if (billId) {
        const match = res.data.data.find((b) => String(b.id) === String(billId));
        if (match) {
          setPartnerId(match.vendor_id);
          setAmount(Number(match.amount_due));
          setMaxAmount(Number(match.amount_due));
        }
      }
    });
  }, [invId, billId]);

  const handleInvoiceChange = (id) => {
    setSelectedInvId(id);
    const match = invoices.find((i) => String(i.id) === String(id));
    if (match) {
      setPartnerId(match.customer_id);
      setAmount(Number(match.amount_due));
      setMaxAmount(Number(match.amount_due));
    }
  };

  const handleBillChange = (id) => {
    setSelectedBillId(id);
    const match = bills.find((b) => String(b.id) === String(id));
    if (match) {
      setPartnerId(match.vendor_id);
      setAmount(Number(match.amount_due));
      setMaxAmount(Number(match.amount_due));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (amount <= 0) return setError("Amount must be > 0");
    if (maxAmount > 0 && amount > maxAmount + 0.01) {
      return setError(`Payment cannot exceed outstanding balance (₹${maxAmount.toFixed(2)})`);
    }

    setSaving(true);
    try {
      await API.createPayment({
        payment_type: paymentType,
        partner_id: partnerId,
        customer_invoice_id: paymentType === "RECEIVE" ? selectedInvId : null,
        vendor_bill_id: paymentType === "SEND" ? selectedBillId : null,
        amount: Number(amount),
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference,
        note,
      });
      navigate("/payments");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pageWorkspace">
      <div className="pageCard" style={{ maxWidth: 650, margin: "0 auto" }}>
        <div className="pageHeader">
          <h1 className="pageTitle">Register Payment</h1>
          <button onClick={() => navigate("/payments")} className="btnSecondary">Cancel</button>
        </div>

        {error && <div className="errorText" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="formGrid">
            <div className="formGroup">
              <label>Payment Type *</label>
              <select
                className="formControl"
                value={paymentType}
                onChange={(e) => {
                  setPaymentType(e.target.value);
                  setSelectedInvId("");
                  setSelectedBillId("");
                  setAmount(0);
                  setMaxAmount(0);
                }}
              >
                <option value="RECEIVE">Receive Payment (Customer Collection)</option>
                <option value="SEND">Send Payment (Vendor Settlement)</option>
              </select>
            </div>

            {paymentType === "RECEIVE" ? (
              <div className="formGroup">
                <label>Select Customer Invoice *</label>
                <select
                  className="formControl"
                  value={selectedInvId}
                  onChange={(e) => handleInvoiceChange(e.target.value)}
                  required
                >
                  <option value="">Select Unpaid Invoice</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} - {inv.customer_name} (Due: ₹{Number(inv.amount_due).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="formGroup">
                <label>Select Vendor Bill *</label>
                <select
                  className="formControl"
                  value={selectedBillId}
                  onChange={(e) => handleBillChange(e.target.value)}
                  required
                >
                  <option value="">Select Unpaid Bill</option>
                  {bills.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bill_number} - {b.vendor_name} (Due: ₹{Number(b.amount_due).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="formGroup">
              <label>Payment Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={maxAmount || undefined}
                className="formControl"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              {maxAmount > 0 && <small style={{ color: "var(--ufTextMuted)" }}>Max balance: ₹{maxAmount.toFixed(2)}</small>}
            </div>

            <div className="formGroup">
              <label>Payment Method *</label>
              <select
                className="formControl"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="BANK">Bank Transfer / Cheque</option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Payment Date *</label>
              <input
                type="date"
                className="formControl"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            <div className="formGroup">
              <label>Reference / Cheque #</label>
              <input
                type="text"
                className="formControl"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="TXN123456"
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
            <button type="button" onClick={() => navigate("/payments")} className="btnSecondary">Cancel</button>
            <button type="submit" className="btnPrimary" disabled={saving}>
              {saving ? "Processing..." : "Confirm & Save Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
