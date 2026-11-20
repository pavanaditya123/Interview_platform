import { ENV } from "../lib/env.js";

const LANGUAGES = {
    javascript: { language: "javascript", version: "18.15.0", file: "main.js" },
    python: { language: "python", version: "3.10.0", file: "main.py" },
    java: { language: "java", version: "15.0.2", file: "Main.java" },
};

const MAX_CODE_BYTES = 64 * 1024;
const TIMEOUT_MS = 15000;

// Proxies code execution to a self-hosted Piston instance so the secret URL stays server side
// and the request is rate limited per user.
export async function executeCode(req, res) {
    const { language, code } = req.body ?? {};
    const config = LANGUAGES[language];

    if (!config) {
        return res.status(400).json({ success: false, error: `Unsupported language: ${language}` });
    }
    if (typeof code !== "string" || code.length === 0) {
        return res.status(400).json({ success: false, error: "code is required" });
    }
    if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) {
        return res.status(413).json({ success: false, error: "Code is too large (max 64KB)" });
    }
    if (!ENV.PISTON_API_URL) {
        return res.status(503).json({
            success: false,
            error: "Server-side code execution is not configured (set PISTON_API_URL).",
        });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(`${ENV.PISTON_API_URL.replace(/\/$/, "")}/execute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
                language: config.language,
                version: config.version,
                files: [{ name: config.file, content: code }],
                run_timeout: 5000,
                compile_timeout: 10000,
            }),
        });

        if (!response.ok) {
            return res.status(502).json({ success: false, error: `Execution server error (${response.status})` });
        }

        const data = await response.json();
        const compileErr = data.compile?.code ? data.compile.stderr || data.compile.output : "";
        const output = data.run?.stdout ?? data.run?.output ?? "";
        const stderr = compileErr || data.run?.stderr || "";

        if (stderr) {
            return res.status(200).json({ success: false, output, error: stderr });
        }
        return res.status(200).json({ success: true, output: output || "No output" });
    } catch (error) {
        const message = error.name === "AbortError" ? "Execution timed out" : error.message;
        return res.status(504).json({ success: false, error: `Failed to execute code: ${message}` });
    } finally {
        clearTimeout(timer);
    }
}
