import express from "express";
import dotenv from "dotenv";
const app = express()

app.get("/", (req, res) => {
    res.status(200).json({ msg: "success from 123" });
})

app.listen(3000, () => console.log("server is running on the port"));