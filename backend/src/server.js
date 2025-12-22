import express from "express";
import cors from "cors";
import path from "path";
import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";
import { inngest } from "./lib/inngest.js";
import { serve } from "inngest/express";
import { functions } from "./lib/inngest.js";

const app = express();
const __dirname = path.resolve();

// middlewares
app.use(express.json());
app.use(cors({
    origin: ENV.CLIENT_URL,
    credentials: true,
}));

// inngest
app.use("/api/inngest", serve({ client: inngest, functions }));

// production frontend
if (ENV.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../frontend/dist")));
    app.get("*", (req, res) => {
        res.sendFile(
            path.join(__dirname, "../frontend/dist/index.html")
        );
    });
}

// start server
const startServer = async () => {
    try {
        await connectDB();
        app.listen(ENV.PORT, () => {
            console.log("Server running on port", ENV.PORT);
        });
    } catch (error) {
        console.error("Error starting server:", error);
    }
};

startServer();
