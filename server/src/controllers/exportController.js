const { query } = require("../config/db");

async function exportInvoicePdf(req, res) {
  try {
    const invResult = await query(
      `SELECT ci.*, c.name AS customer_name, c.email AS customer_email, c.mobile AS customer_mobile, c.street, c.city, c.state, c.pincode
       FROM customer_invoices ci
       JOIN contacts c ON c.id = ci.customer_id
       WHERE ci.id = $1`,
      [req.params.id]
    );
    if (invResult.rows.length === 0) {
      return res.status(404).send("Invoice not found");
    }
    const inv = invResult.rows[0];

    const linesResult = await query(
      `SELECT cil.*, p.name AS product_name
       FROM customer_invoice_lines cil
       JOIN products p ON p.id = cil.product_id
       WHERE cil.invoice_id = $1`,
      [inv.id]
    );
    const lines = linesResult.rows;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${inv.invoice_number}</title>
  <style>
    body { font-family: sans-serif; padding: 40px; color: #333; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #714b67; padding-bottom: 20px; }
    .title { color: #714b67; font-size: 28px; font-weight: bold; }
    .details { margin: 30px 0; display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #714b67; color: white; padding: 10px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    .totals { margin-top: 30px; text-align: right; font-size: 16px; }
    .totals div { margin: 5px 0; }
    .grandTotal { font-size: 20px; font-weight: bold; color: #714b67; }
  </style>
</head>
<body onload="window.print()">
  <div class="header">
    <div>
      <div class="title">INVOICE</div>
      <div>Urban Furniture ERP</div>
    </div>
    <div style="text-align: right;">
      <div><strong>Invoice #:</strong> ${inv.invoice_number}</div>
      <div><strong>Date:</strong> ${new Date(inv.invoice_date).toLocaleDateString()}</div>
      <div><strong>Due Date:</strong> ${inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</div>
      <div><strong>Status:</strong> ${inv.status}</div>
    </div>
  </div>

  <div class="details">
    <div>
      <strong>Customer:</strong><br/>
      ${inv.customer_name}<br/>
      ${inv.email || ''}<br/>
      ${inv.mobile || ''}<br/>
      ${inv.street || ''} ${inv.city || ''} ${inv.state || ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Tax %</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${lines.map(l => `
        <tr>
          <td>${l.product_name}</td>
          <td>${l.quantity}</td>
          <td>₹${Number(l.unit_price).toFixed(2)}</td>
          <td>${l.tax_rate}%</td>
          <td>₹${Number(l.line_total).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div>Subtotal: ₹${Number(inv.subtotal).toFixed(2)}</div>
    <div>Tax: ₹${Number(inv.tax_amount).toFixed(2)}</div>
    <div class="grandTotal">Total: ₹${Number(inv.total_amount).toFixed(2)}</div>
    <div>Amount Paid: ₹${Number(inv.amount_paid).toFixed(2)}</div>
    <div>Amount Due: ₹${Number(inv.amount_due).toFixed(2)}</div>
  </div>
</body>
</html>
    `;

    res.setHeader("Content-Type", "text/html");
    return res.send(html);
  } catch (err) {
    console.error("exportInvoicePdf error", err);
    return res.status(500).send("Export failed");
  }
}

async function exportCsv(req, res) {
  const { entity } = req.params;
  try {
    let rows = [];
    let filename = `${entity}.csv`;

    if (entity === "products") {
      const resData = await query("SELECT p.id, p.name, pc.name as category, p.product_type, p.sales_price, p.cost_price FROM products p LEFT JOIN product_categories pc ON pc.id = p.category_id");
      rows = resData.rows;
    } else if (entity === "contacts") {
      const resData = await query("SELECT id, name, type, email, mobile, city, state FROM contacts");
      rows = resData.rows;
    } else if (entity === "invoices") {
      const resData = await query("SELECT ci.invoice_number, c.name as customer, ci.invoice_date, ci.status, ci.total_amount, ci.amount_due FROM customer_invoices ci JOIN contacts c ON c.id = ci.customer_id");
      rows = resData.rows;
    } else if (entity === "bills") {
      const resData = await query("SELECT vb.bill_number, c.name as vendor, vb.bill_date, vb.status, vb.total_amount, vb.amount_due FROM vendor_bills vb JOIN contacts c ON c.id = vb.vendor_id");
      rows = resData.rows;
    } else {
      return res.status(400).send("Invalid export entity");
    }

    if (rows.length === 0) {
      return res.send("No data to export");
    }

    const headers = Object.keys(rows[0]).join(",");
    const body = rows.map(r => Object.values(r).map(v => `"${v ?? ''}"`).join(",")).join("\n");
    const csvContent = `${headers}\n${body}`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (err) {
    console.error("exportCsv error", err);
    return res.status(500).send("Export CSV failed");
  }
}

module.exports = { exportInvoicePdf, exportCsv };
