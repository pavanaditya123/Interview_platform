import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        // In dev, forward /api to the backend so the app can use same-origin relative URLs.
        proxy: {
            "/api": { target: globalThis.process?.env?.VITE_DEV_API_TARGET || "http://localhost:3000", changeOrigin: true },
        },
    },
    build: {
        target: "es2022",
        // Pages are lazy-loaded in App.jsx, so heavy deps (Stream, Monaco) land in their page's chunk.
        // Manual vendor chunks were removed: splitting React from Clerk broke module init order.
        chunkSizeWarningLimit: 2000,
    },
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./src/test/setup.js"],
        css: false,
    },
});
