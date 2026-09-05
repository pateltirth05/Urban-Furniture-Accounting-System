const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const contactRoutes = require("./routes/contactRoutes");
const productCategoryRoutes = require("./routes/productCategoryRoutes");
const productRoutes = require("./routes/productRoutes");
const chartOfAccountRoutes = require("./routes/chartOfAccountRoutes");
const journalRoutes = require("./routes/journalRoutes");
const journalEntryRoutes = require("./routes/journalEntryRoutes");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");
const vendorBillRoutes = require("./routes/vendorBillRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const analyticAccountRoutes = require("./routes/analyticAccountRoutes");
const salesOrderRoutes = require("./routes/salesOrderRoutes");
const customerInvoiceRoutes = require("./routes/customerInvoiceRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const reportRoutes = require("./routes/reportRoutes");
const stockRoutes = require("./routes/stockRoutes");
const exportRoutes = require("./routes/exportRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/product-categories", productCategoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/chart-of-accounts", chartOfAccountRoutes);
app.use("/api/journals", journalRoutes);
app.use("/api/journal-entries", journalEntryRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/vendor-bills", vendorBillRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytic-accounts", analyticAccountRoutes);
app.use("/api/sales-orders", salesOrderRoutes);
app.use("/api/customer-invoices", customerInvoiceRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/export", exportRoutes);

// TODO once passwordController and balanceSheetController are built:
// app.use('/api/auth', passwordRoutes)  // forgot/reset password
// app.use('/api/reports/balance-sheet', balanceSheetRoutes)

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Centralized error handler (catches anything thrown/rejected in controllers
// that wasn't already caught locally)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

module.exports = app;
