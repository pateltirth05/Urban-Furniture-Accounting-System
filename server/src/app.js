import express from "express"
import authRoutes from "./routes/authRoutes.js";
const app=express();

app.use(express.json())
app.use("/api/auth", authRoutes);
app.get("/health",(req,res)=>{
    res.json({
        message:"Urban Furniture Accounting API health test"
    })
})

export default app;