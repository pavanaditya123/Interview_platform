import { AiError, isAiConfigured, streamText } from "../lib/ai.js";
import { HINT_LEVEL_NUMBERS, HINT_SYSTEM, REVIEW_SYSTEM, hintPrompt, reviewPrompt } from "../lib/prompts.js";

const LANGUAGES = ["javascript", "python", "java"];
const LIMITS = { title: 200, description: 6000, code: 20000 };

const validateCommon = (body = {}) => {
    const { problemTitle, problemDescription, language, code } = body;
    if (typeof problemTitle !== "string" || !problemTitle.trim()) return "problemTitle is required";
    if (typeof problemDescription !== "string" || !problemDescription.trim()) return "problemDescription is required";
    if (!LANGUAGES.includes(language)) return "language must be javascript, python or java";
    if (typeof code !== "string") return "code must be a string";
    if (problemTitle.length > LIMITS.title || problemDescription.length > LIMITS.description || code.length > LIMITS.code) {
        return "Input is too long";
    }
    return null;
};

// Streams AI output as Server-Sent Events: `data: {"text": "..."}` chunks, then `data: {"done": true}`.
export async function streamToClient(req, res, { system, prompt, messages, maxTokens, onComplete }) {
    res.status(200).set({
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
    });
    res.flushHeaders();

    const send = (payload) => {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
        res.flush?.(); // compression middleware buffers otherwise
    };

    // Stop generating if the user navigates away.
    const controller = new AbortController();
    res.on("close", () => controller.abort());

    let full = "";
    try {
        const { blocked } = await streamText(
            { system, prompt, messages, maxTokens },
            {
                onText: (text) => {
                    full += text;
                    send({ text });
                },
                signal: controller.signal,
            }
        );
        if (blocked) send({ error: "The AI couldn't answer this request." });
        else if (onComplete && full.trim()) await onComplete(full);
        send({ done: true });
    } catch (error) {
        if (controller.signal.aborted) return;
        console.error("AI stream error:", error.message);
        send({ error: error instanceof AiError ? error.message : "Failed to generate a response." });
    } finally {
        if (!res.writableEnded) res.end();
    }
}

export const notConfigured = (res) =>
    res.status(503).json({ message: "AI is not configured (set GROQ_API_KEY or GEMINI_API_KEY)." });

export async function getHint(req, res) {
    if (!isAiConfigured()) return notConfigured(res);
    const invalid = validateCommon(req.body) || (!HINT_LEVEL_NUMBERS.includes(Number(req.body.level)) && "level must be 1, 2 or 3");
    if (invalid) return res.status(400).json({ message: invalid });
    return streamToClient(req, res, {
        system: HINT_SYSTEM,
        prompt: hintPrompt({ ...req.body, level: Number(req.body.level) }),
        maxTokens: 1200,
    });
}

export async function getReview(req, res) {
    if (!isAiConfigured()) return notConfigured(res);
    const invalid = validateCommon(req.body) || (!req.body.code.trim() && "Write some code before asking for a review");
    if (invalid) return res.status(400).json({ message: invalid });
    return streamToClient(req, res, { system: REVIEW_SYSTEM, prompt: reviewPrompt(req.body), maxTokens: 2000 });
}
