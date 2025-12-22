import express from "express";
import { ENV } from "./lib/env.js";
import path from "path";

const app = express();

// Resolve absolute path
const __dirname = path.resolve();

// Health check
app.get("/health", (req, res) => {
    res.status(200).json({ msg: "success from 1234" });
});

// Serve frontend in production
if (ENV.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "frontend", "dist")));

    // SPA fallback (VERY IMPORTANT)
    app.get("*", (req, res) => {
        res.sendFile(
            path.join(__dirname, "frontend", "dist", "index.html")
        );
    });
}

// Start server
app.listen(ENV.PORT, () => {
    console.log("server is running on the port", ENV.PORT);
});
