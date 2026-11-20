import axiosInstance, { getErrorMessage } from "./axios";
import { formatValue } from "./judge";

// The public Piston API became whitelist-only in Feb 2026, so:
//  - JavaScript runs in a sandboxed Web Worker in the browser (instant, zero server load)
//  - Python runs in the browser via Pyodide (WebAssembly CPython), loaded lazily on first use
//  - Java is sent to the backend, which proxies to a self-hosted Piston (PISTON_API_URL)

const RUN_TIMEOUT_MS = 8000;
const PYODIDE_VERSION = "0.26.4";

const jsWorkerSource = `
const formatValue = ${formatValue.toString()};
const out = [];
const push = (...args) => out.push(args.map(formatValue).join(" "));
self.console = { log: push, info: push, warn: push, debug: push, error: push };
self.onmessage = async (e) => {
  try {
    const fn = new Function(e.data);
    await fn();
    self.postMessage({ ok: true, output: out.join("\\n") });
  } catch (err) {
    self.postMessage({ ok: false, output: out.join("\\n"), error: (err && err.stack) || String(err) });
  }
};`;

function runJavaScript(code) {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(new Blob([jsWorkerSource], { type: "text/javascript" }));
        const worker = new Worker(url);
        const done = (result) => {
            clearTimeout(timer);
            worker.terminate();
            URL.revokeObjectURL(url);
            resolve(result);
        };
        const timer = setTimeout(
            () => done({ success: false, error: `Time limit exceeded (${RUN_TIMEOUT_MS / 1000}s). Check for infinite loops.` }),
            RUN_TIMEOUT_MS
        );
        worker.onmessage = ({ data }) =>
            done(data.ok ? { success: true, output: data.output || "No output" } : { success: false, output: data.output, error: data.error });
        worker.onerror = (e) => done({ success: false, error: e.message || "Worker error" });
        worker.postMessage(code);
    });
}

const pyWorkerSource = `
importScripts("https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js");
const ready = loadPyodide();
self.onmessage = async (e) => {
  const pyodide = await ready;
  const out = [];
  pyodide.setStdout({ batched: (s) => out.push(s) });
  pyodide.setStderr({ batched: (s) => out.push(s) });
  try {
    const scope = pyodide.globals.get("dict")();
    await pyodide.runPythonAsync(e.data, { globals: scope });
    scope.destroy();
    self.postMessage({ ok: true, output: out.join("\\n") });
  } catch (err) {
    self.postMessage({ ok: false, output: out.join("\\n"), error: String(err.message || err) });
  }
};`;

let pyWorker = null;
let pyWorkerUrl = null;
const getPyWorker = () => {
    if (!pyWorker) {
        pyWorkerUrl = URL.createObjectURL(new Blob([pyWorkerSource], { type: "text/javascript" }));
        pyWorker = new Worker(pyWorkerUrl);
    }
    return pyWorker;
};
const resetPyWorker = () => {
    pyWorker?.terminate();
    if (pyWorkerUrl) URL.revokeObjectURL(pyWorkerUrl);
    pyWorker = null;
    pyWorkerUrl = null;
};

// Start downloading Pyodide in the background so the first Python run is fast.
export const preloadPython = () => {
    if (typeof Worker !== "undefined") getPyWorker();
};

function runPython(code) {
    return new Promise((resolve) => {
        const worker = getPyWorker();
        // First run includes the Pyodide download, so allow more time.
        const timer = setTimeout(() => {
            resetPyWorker();
            resolve({ success: false, error: "Time limit exceeded. Check for infinite loops." });
        }, RUN_TIMEOUT_MS * 4);
        worker.onmessage = ({ data }) => {
            clearTimeout(timer);
            resolve(data.ok ? { success: true, output: data.output || "No output" } : { success: false, output: data.output, error: data.error });
        };
        worker.onerror = (e) => {
            clearTimeout(timer);
            resetPyWorker();
            resolve({ success: false, error: e.message || "Failed to load the Python runtime" });
        };
        worker.postMessage(code);
    });
}

async function runOnServer(language, code) {
    try {
        const { data } = await axiosInstance.post("/code/execute", { language, code }, { timeout: 30000 });
        return data;
    } catch (error) {
        return { success: false, error: getErrorMessage(error, "Failed to execute code") };
    }
}

export async function executeCode(language, code) {
    try {
        switch (language) {
            case "javascript":
                return await runJavaScript(code);
            case "python":
                return await runPython(code);
            case "java":
                return await runOnServer(language, code);
            default:
                return { success: false, error: `Unsupported language: ${language}` };
        }
    } catch (error) {
        return { success: false, error: `Failed to execute code: ${error.message}` };
    }
}
