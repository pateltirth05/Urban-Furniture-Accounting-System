import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { API } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import StatusBadge from "../../components/StatusBadge";

export default function CustomerInvoiceView() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    API.getCustomerInvoice(id)
      .then((res) => setInvoice(res.data.data))
      .catch(() => setError("Failed to load invoice details"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState message="Loading invoice document..." />;
  if (error || !invoice) return <div className="pageWorkspace"><div className="errorText">{error || "Invoice not found"}</div></div>;

  return (
    <div className="pageWorkspace">
      <div className="pageCard" style={{ maxWidth: 850, margin: "0 auto" }}>
        <div className="pageHeader">
          <div>
            <h1 className="pageTitle" style={{ display: "inline-block", marginRight: 12 }}>
              Invoice {invoice.invoice_number}
            </h1>
            <StatusBadge status={invoice.status} />
          </div>
          <div className="actionRow">
            <a
              href={API.exportInvoicePdfUrl(invoice.id)}
              target="_blank"
              rel="noreferrer"
              className="btnPrimary"
            >
              Print / Download PDF
            </a>
            <Link to="/sales/invoices" className="btnSecondary">Back to Invoices</Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          <div>
            <strong>Billed To:</strong>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{invoice.customer_name}</div>
            <div>{invoice.customer_email || ""}</div>
            <div>{invoice.customer_mobile || ""}</div>
            <div>{invoice.street} {invoice.city} {invoice.state}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div><strong>Invoice Date:</strong> {new Date(invoice.invoice_date).toLocaleDateString()}</div>
            <div><strong>Due Date:</strong> {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "Immediate"}</div>
            <div><strong>Reference:</strong> {invoice.invoice_reference || "N/A"}</div>
          </div>
        </div>

        <table className="lineItemsTable">
          <thead>
            <tr>
              <th>Product Description</th>
              <th>Qty</th>
              <th>Unit Price (₹)</th>
              <th>Tax %</th>
              <th>Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines?.map((l) => (
              <tr key={l.id}>
                <td><strong>{l.product_name}</strong></td>
                <td>{l.quantity}</td>
                <td>₹{Number(l.unit_price).toFixed(2)}</td>
                <td>{l.tax_rate}%</td>
                <td>₹{Number(l.line_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ background: "#f8f9fa", padding: 16, borderRadius: 6, width: 300, marginLeft: "auto", textAlign: "right" }}>
          <div>Subtotal: ₹{Number(invoice.subtotal).toFixed(2)}</div>
          <div>Tax: ₹{Number(invoice.tax_amount).toFixed(2)}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ufPrimary)", margin: "6px 0" }}>
            Grand Total: ₹{Number(invoice.total_amount).toFixed(2)}
          </div>
          <div style={{ color: "var(--ufSuccess)" }}>Amount Paid: ₹{Number(invoice.amount_paid).toFixed(2)}</div>
          <div style={{ color: "var(--ufDanger)", fontWeight: 600 }}>Amount Due: ₹{Number(invoice.amount_due).toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
