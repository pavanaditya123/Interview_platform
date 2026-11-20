import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { serve } from "inngest/express";
import { clerkMiddleware } from "@clerk/express";

import { ENV } from "./lib/env.js";
import { inngest, functions } from "./lib/inngest.js";
import chatRoutes from "./routes/chatRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import codeRoutes from "./routes/codeRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import mockInterviewRoutes from "./routes/mockInterviewRoutes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, "../../frontend/dist");

export function createApp() {
    const app = express();

    // Render / most PaaS sit behind one proxy hop; needed for correct client IPs in rate limiting.
    app.set("trust proxy", 1);
    app.disable("x-powered-by");

    app.use(
        helmet({
            // CSP is left off because Clerk, Stream and Monaco load scripts/workers from their CDNs.
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false,
        })
    );
    app.use(compression());
    app.use(express.json({ limit: "100kb" }));
    app.use(
        cors({
            origin: ENV.CLIENT_URL ? ENV.CLIENT_URL.split(",").map((o) => o.trim()) : true,
            credentials: true,
        })
    );

    // Health check for Render / uptime monitors (no auth, no DB query).
    app.get("/health", (_req, res) => {
        res.status(200).json({
            status: "ok",
            db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
            uptime: Math.round(process.uptime()),
        });
    });

    // Inngest verifies its own signatures; mount before Clerk so webhooks are not blocked.
    app.use("/api/inngest", serve({ client: inngest, functions }));

    app.use(
        "/api",
        rateLimit({
            windowMs: 60 * 1000,
            limit: 300,
            standardHeaders: "draft-7",
            legacyHeaders: false,
            message: { message: "Too many requests, please slow down." },
        })
    );

    // Only API routes need auth; keeping Clerk off static/HTML requests avoids handshake redirects.
    app.use("/api", clerkMiddleware()); // adds req.auth

    app.use("/api/chat", chatRoutes);
    app.use("/api/sessions", sessionRoutes);
    app.use("/api/code", codeRoutes);
    app.use("/api/ai", aiRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/mock-interviews", mockInterviewRoutes);

    app.use("/api", (_req, res) => res.status(404).json({ message: "Route not found" }));

    if (ENV.NODE_ENV === "production") {
        // Hashed assets are immutable: cache for a year. index.html must always revalidate.
        app.use(
            express.static(distPath, {
                index: false,
                setHeaders: (res, filePath) => {
                    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
                        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
                    } else {
                        res.setHeader("Cache-Control", "public, max-age=3600");
                    }
                },
            })
        );

        app.use((req, res) => {
            res.setHeader("Cache-Control", "no-cache");
            res.sendFile(path.join(distPath, "index.html"));
        });
    }

    // eslint-disable-next-line no-unused-vars
    app.use((err, _req, res, _next) => {
        if (err.type === "entity.too.large") {
            return res.status(413).json({ message: "Request body too large" });
        }
        if (err.type === "entity.parse.failed") {
            return res.status(400).json({ message: "Invalid JSON body" });
        }
        console.error("Unhandled error:", err);
        res.status(err.status || 500).json({ message: "Internal Server Error" });
    });

    return app;
}

export default createApp;
