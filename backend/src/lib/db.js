import mongoose from "mongoose";
import { ENV } from "./env.js";

let connecting = null;

// Reuses a single pooled connection. Safe to call many times (Inngest functions call it per event).
export const connectDB = async (url = ENV.DB_URL) => {
    if (mongoose.connection.readyState === 1) return mongoose.connection;
    if (connecting) return connecting;
    if (!url) throw new Error("DB_URL is not set");

    connecting = mongoose
        .connect(url, {
            maxPoolSize: 20,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        })
        .then((conn) => {
            console.log("Connected to MongoDB:", conn.connection.host);
            return conn.connection;
        })
        .finally(() => {
            connecting = null;
        });

    return connecting;
};

export const disconnectDB = async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
};
