import express from "express"
import authRoutes from "./routes/authRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import productCategoryRoutes from "./routes/productCategoryRoutes.js";
import journalEntryRoutes from "./routes/journalEntryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import chartOfAccountRoutes from "./routes/chartOfAccountRoutes.js";
import journalRoutes from "./routes/journalRoutes.js"
import purchaseOrderRoutes from "./routes/purchaseOrderRoutes.js";
import vendorBillRoutes from "./routes/vendorBillRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import analyticAccountRoutes from "./routes/analyticAccountRoutes.js";
const app=express();

app.use(express.json())
app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/product-categories", productCategoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/accounts", chartOfAccountRoutes);
app.use("/api/journals", journalRoutes);
app.use("/api/journal-entries", journalEntryRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/vendor-bills", vendorBillRoutes);
app.use("/api/payments",paymentRoutes)
app.use("/api/analytic-accounts", analyticAccountRoutes);
app.get("/health",(req,res)=>{
    res.json({
        message:"Urban Furniture Accounting API health test"
    })
})

export default app;