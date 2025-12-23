import express from "express";
import cors from "cors";
import path from "path";
import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";
import { inngest } from "./lib/inngest.js";
import { serve } from "inngest/express";
import { functions } from "./lib/inngest.js";
import { clerkMiddleware } from '@clerk/express';
import { protectRoute } from './middleware/protectRoute.js';
import chatRoutes from './routes/chatRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';

const app = express();
const __dirname = path.resolve();

// middlewares
app.use(express.json());
app.use(cors({
    origin: ENV.CLIENT_URL,
    credentials: true,
}));
app.use(clerkMiddleware());//this adds auth field to request object
// inngest
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("api/chat", chatRoutes);
app.use("api/sessions", sessionRoutes);
app.get("/video-calls", protectRoute, (req, res) => {

    res.status(200).json({ msg: "this is the protected endpoint " });
});
// production frontend
if (ENV.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../frontend/dist")));

    app.use((req, res) => {
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
