import { ENV } from "./env.js";

// Provider-agnostic streaming text generation over plain fetch (no SDKs).
// Uses Groq when GROQ_API_KEY is set (fastest), otherwise Gemini when GEMINI_API_KEY is set.

const TIMEOUT_MS = 60_000;

export class AiError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

export const getProvider = () => {
    if (ENV.GROQ_API_KEY) return "groq";
    if (ENV.GEMINI_API_KEY) return "gemini";
    return null;
};
export const isAiConfigured = () => getProvider() !== null;

// Reads a text/event-stream body and yields each `data:` payload string.
async function* readSse(body) {
    const decoder = new TextDecoder();
    let buffer = "";
    for await (const chunk of body) {
        buffer += decoder.decode(chunk, { stream: true });
        let idx;
        while ((idx = buffer.search(/\r?\n\r?\n/)) !== -1) {
            const rawEvent = buffer.slice(0, idx);
            buffer = buffer.slice(idx).replace(/^\r?\n\r?\n/, "");
            const data = rawEvent
                .split(/\r?\n/)
                .filter((l) => l.startsWith("data:"))
                .map((l) => l.slice(5).trimStart())
                .join("\n");
            if (data) yield data;
        }
    }
}

const providers = {
    groq: {
        request: ({ system, prompt, maxTokens }) => ({
            url: "https://api.groq.com/openai/v1/chat/completions",
            headers: { Authorization: `Bearer ${ENV.GROQ_API_KEY}` },
            body: {
                model: ENV.GROQ_MODEL,
                stream: true,
                max_completion_tokens: maxTokens,
                temperature: 0.4,
                ...(ENV.GROQ_MODEL.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: prompt },
                ],
            },
        }),
        parse: (data) => {
            if (data === "[DONE]") return { done: true };
            const json = JSON.parse(data);
            return { text: json.choices?.[0]?.delta?.content ?? "" };
        },
    },
    gemini: {
        request: ({ system, prompt, maxTokens }) => ({
            url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(ENV.GEMINI_MODEL)}:streamGenerateContent?alt=sse`,
            headers: { "x-goog-api-key": ENV.GEMINI_API_KEY },
            body: {
                systemInstruction: { parts: [{ text: system }] },
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
            },
        }),
        parse: (data) => {
            const json = JSON.parse(data);
            const cand = json.candidates?.[0];
            const text = (cand?.content?.parts ?? []).map((p) => (p.thought ? "" : p.text ?? "")).join("");
            const blocked = json.promptFeedback?.blockReason || cand?.finishReason === "SAFETY";
            return { text, blocked: Boolean(blocked) };
        },
    },
};

/**
 * Streams generated text. Calls onText per chunk; resolves with { blocked } when finished.
 * Throws AiError on HTTP/network failures. Abort with `signal`.
 */
export async function streamText({ system, prompt, maxTokens = 1500 }, { onText, signal } = {}) {
    const name = getProvider();
    if (!name) throw new AiError("No AI provider configured", 503);
    const provider = providers[name];
    const { url, headers, body } = provider.request({ system, prompt, maxTokens });

    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

    let res;
    try {
        res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "text/event-stream", ...headers },
            body: JSON.stringify(body),
            signal: combined,
        });
    } catch (error) {
        if (signal?.aborted) throw error;
        throw new AiError(error.name === "TimeoutError" ? "AI request timed out" : "Could not reach the AI service", 502);
    }

    if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error(`AI provider ${name} returned ${res.status}: ${detail.slice(0, 300)}`);
        throw new AiError(res.status === 429 ? "The AI service is busy. Try again in a moment." : "The AI service had a problem. Try again.", res.status);
    }

    let blocked = false;
    for await (const data of readSse(res.body)) {
        let parsed;
        try {
            parsed = provider.parse(data);
        } catch {
            continue; // ignore keep-alives / malformed lines
        }
        if (parsed.done) break;
        if (parsed.blocked) blocked = true;
        if (parsed.text) onText?.(parsed.text);
    }
    return { blocked, provider: name };
}
