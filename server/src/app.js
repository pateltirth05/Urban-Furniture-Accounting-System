import express from "express"
import authRoutes from "./routes/authRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import productCategoryRoutes from "./routes/productCategoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
const app=express();

app.use(express.json())
app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/product-categories", productCategoryRoutes);
app.use("/api/products", productRoutes);
app.get("/health",(req,res)=>{
    res.json({
        message:"Urban Furniture Accounting API health test"
    })
})

export default app;