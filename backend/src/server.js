import { createApp } from "./app.js";
import { ENV } from "./lib/env.js";
import { connectDB, disconnectDB } from "./lib/db.js";

const app = createApp();

const startServer = async () => {
    try {
        await connectDB();
        const server = app.listen(ENV.PORT, () => {
            console.log("Server running on port", ENV.PORT);
        });

        // Keep-alive slightly above typical load balancer idle timeouts to avoid 502s.
        server.keepAliveTimeout = 65000;
        server.headersTimeout = 66000;

        const shutdown = (signal) => {
            console.log(`${signal} received, shutting down gracefully`);
            server.close(async () => {
                await disconnectDB();
                process.exit(0);
            });
            setTimeout(() => process.exit(1), 10000).unref();
        };
        process.on("SIGTERM", () => shutdown("SIGTERM"));
        process.on("SIGINT", () => shutdown("SIGINT"));
    } catch (error) {
        console.error("Error starting server:", error);
        process.exit(1);
    }
};

startServer();
