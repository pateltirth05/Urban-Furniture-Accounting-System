import express from "express"

const app=express();

app.use(express.json())

app.get("/health",(res,req)=>{
    res.json({
        message:"Urban Furniture Accounting API health test"
    })
})

export default app;