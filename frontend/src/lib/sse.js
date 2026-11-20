// POSTs JSON and reads a Server-Sent Events response from our API.
// Server sends `data: {"text"}` chunks, then `{"done": true}` or `{"error"}`.
const API_BASE = import.meta.env.VITE_API_URL || "/api";

export async function streamPost(path, body, { onText, signal } = {}) {
    const headers = { "Content-Type": "application/json", Accept: "text/event-stream" };
    try {
        const token = await window.Clerk?.session?.getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
    } catch {
        // continue unauthenticated
    }

    let res;
    try {
        res = await fetch(`${API_BASE}${path}`, {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify(body ?? {}),
            signal,
        });
    } catch (error) {
        if (error.name === "AbortError") return { aborted: true };
        return { error: "Network error. Check your connection." };
    }

    if (!res.ok || !res.headers.get("content-type")?.includes("text/event-stream")) {
        const data = await res.json().catch(() => ({}));
        return { error: data.message || data.error || `Request failed (${res.status})` };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    let error = null;

    try {
        for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = buffer.indexOf("\n\n")) !== -1) {
                const line = buffer.slice(0, idx).trim();
                buffer = buffer.slice(idx + 2);
                if (!line.startsWith("data:")) continue;
                let payload;
                try {
                    payload = JSON.parse(line.slice(5));
                } catch {
                    continue;
                }
                if (payload.text) {
                    full += payload.text;
                    onText?.(payload.text, full);
                }
                if (payload.error) error = payload.error;
            }
        }
    } catch (e) {
        if (e.name === "AbortError") return { aborted: true, text: full };
        error = "The connection was interrupted.";
    }
    return { text: full, error };
}
