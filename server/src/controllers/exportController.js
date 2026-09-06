const { query } = require("../config/db");
const PDFDocument = require("pdfkit");

async function exportInvoicePdf(req, res) {
  try {
    const invResult = await query(
      `SELECT ci.*,
              c.name AS customer_name,
              c.email AS customer_email,
              c.mobile AS customer_mobile,
              c.street,
              c.city,
              c.state,
              c.pincode
       FROM customer_invoices ci
       JOIN contacts c ON c.id = ci.customer_id
       WHERE ci.id = $1`,
      [req.params.id]
    );

    if (invResult.rows.length === 0) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    const inv = invResult.rows[0];

    const linesResult = await query(
      `SELECT cil.*, p.name AS product_name
       FROM customer_invoice_lines cil
       JOIN products p ON p.id = cil.product_id
       WHERE cil.invoice_id = $1
       ORDER BY cil.id`,
      [inv.id]
    );

    const lines = linesResult.rows;

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="invoice-${inv.invoice_number}.pdf"`
    );

    doc.pipe(res);

    // =========================
    // HEADER
    // =========================

    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("URBAN FURNITURE", { align: "center" });

    doc
      .fontSize(18)
      .text("INVOICE", { align: "center" });

    doc.moveDown();

    // =========================
    // INVOICE DETAILS
    // =========================

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Invoice #: ${inv.invoice_number}`)
      .text(
        `Invoice Date: ${new Date(
          inv.invoice_date
        ).toLocaleDateString()}`
      )
      .text(
        `Due Date: ${
          inv.due_date
            ? new Date(inv.due_date).toLocaleDateString()
            : "N/A"
        }`
      )
      .text(`Status: ${inv.status}`);

    doc.moveDown();

    // =========================
    // CUSTOMER
    // =========================

    doc.font("Helvetica-Bold").text("Bill To:");

    doc.font("Helvetica").text(inv.customer_name || "");

    if (inv.customer_email) {
      doc.text(inv.customer_email);
    }

    if (inv.customer_mobile) {
      doc.text(inv.customer_mobile);
    }

    const address = [
      inv.street,
      inv.city,
      inv.state,
      inv.pincode,
    ]
      .filter(Boolean)
      .join(", ");

    if (address) {
      doc.text(address);
    }

    doc.moveDown();

    // =========================
    // TABLE HEADER
    // =========================

    const tableY = doc.y;

    doc.font("Helvetica-Bold");

    doc.text("Product", 50, tableY, {
      width: 180,
    });

    doc.text("Qty", 230, tableY, {
      width: 50,
    });

    doc.text("Unit Price", 280, tableY, {
      width: 90,
    });

    doc.text("Tax", 370, tableY, {
      width: 60,
    });

    doc.text("Total", 430, tableY, {
      width: 100,
    });

    doc.moveDown();

    doc
      .moveTo(50, doc.y)
      .lineTo(540, doc.y)
      .stroke();

    doc.moveDown(0.5);

    // =========================
    // INVOICE LINES
    // =========================

    doc.font("Helvetica");

    for (const line of lines) {
      const y = doc.y;

      doc.text(line.product_name || "", 50, y, {
        width: 180,
      });

      doc.text(String(line.quantity), 230, y, {
        width: 50,
      });

      doc.text(
        `Rs. ${Number(line.unit_price).toFixed(2)}`,
        280,
        y,
        {
          width: 90,
        }
      );

      doc.text(
        `${Number(line.tax_rate || 0).toFixed(2)}%`,
        370,
        y,
        {
          width: 60,
        }
      );

      doc.text(
        `Rs. ${Number(line.line_total).toFixed(2)}`,
        430,
        y,
        {
          width: 100,
        }
      );

      doc.moveDown(1.5);
    }

    doc.moveDown();

    doc
      .moveTo(350, doc.y)
      .lineTo(540, doc.y)
      .stroke();

    doc.moveDown();

    // =========================
    // TOTALS
    // =========================

    doc
      .font("Helvetica")
      .fontSize(10)
      .text(
        `Subtotal: Rs. ${Number(inv.subtotal).toFixed(2)}`,
        350,
        doc.y,
        {
          width: 190,
          align: "right",
        }
      );

    doc.text(
      `Tax: Rs. ${Number(inv.tax_amount).toFixed(2)}`,
      350,
      doc.y,
      {
        width: 190,
        align: "right",
      }
    );

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(
        `Total: Rs. ${Number(inv.total_amount).toFixed(2)}`,
        350,
        doc.y,
        {
          width: 190,
          align: "right",
        }
      );

    doc
      .font("Helvetica")
      .fontSize(10)
      .text(
        `Amount Paid: Rs. ${Number(inv.amount_paid).toFixed(2)}`,
        350,
        doc.y,
        {
          width: 190,
          align: "right",
        }
      );

    doc.text(
      `Amount Due: Rs. ${Number(inv.amount_due).toFixed(2)}`,
      350,
      doc.y,
      {
        width: 190,
        align: "right",
      }
    );

    doc.moveDown(3);

    doc
      .fontSize(9)
      .text(
        "Thank you for doing business with Urban Furniture.",
        {
          align: "center",
        }
      );

    doc.end();
  } catch (err) {
    console.error("exportInvoicePdf error:", err);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Failed to generate invoice PDF",
      });
    }

    res.end();
  }
}


// =====================================================
// CSV EXPORT
// =====================================================

async function exportCsv(req, res) {
  const { entity } = req.params;

  try {
    let rows = [];
    let filename = `${entity}.csv`;

    if (entity === "products") {
      const result = await query(
        `SELECT
          p.id,
          p.name,
          pc.name AS category,
          p.product_type,
          p.sales_price,
          p.cost_price
         FROM products p
         LEFT JOIN product_categories pc
           ON pc.id = p.category_id`
      );

      rows = result.rows;
    }

    else if (entity === "contacts") {
      const result = await query(
        `SELECT
          id,
          name,
          type,
          email,
          mobile,
          city,
          state
         FROM contacts`
      );

      rows = result.rows;
    }

    else if (entity === "invoices") {
      const result = await query(
        `SELECT
          ci.invoice_number,
          c.name AS customer,
          ci.invoice_date,
          ci.status,
          ci.total_amount,
          ci.amount_due
         FROM customer_invoices ci
         JOIN contacts c
           ON c.id = ci.customer_id`
      );

      rows = result.rows;
    }

    else if (entity === "bills") {
      const result = await query(
        `SELECT
          vb.bill_number,
          c.name AS vendor,
          vb.bill_date,
          vb.status,
          vb.total_amount,
          vb.amount_due
         FROM vendor_bills vb
         JOIN contacts c
           ON c.id = vb.vendor_id`
      );

      rows = result.rows;
    }

    else {
      return res.status(400).send("Invalid export entity");
    }

    if (rows.length === 0) {
      return res.send("No data to export");
    }

    const headers = Object.keys(rows[0]).join(",");

    const body = rows
      .map((row) =>
        Object.values(row)
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const csvContent = `${headers}\n${body}`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    return res.send(csvContent);

  } catch (err) {
    console.error("exportCsv error:", err);

    return res.status(500).send("Export CSV failed");
  }
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  exportInvoicePdf,
  exportCsv,
};