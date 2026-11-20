import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { createApp } from "../src/app.js";
import { ENV } from "../src/lib/env.js";
import User from "../src/models/User.js";
import { clearUserCache } from "../src/middleware/protectRoute.js";

const realFetch = globalThis.fetch;

// Build a streaming Response from SSE events, split at awkward byte boundaries on purpose.
const sseResponse = (events, { status = 200, splitAt = 7 } = {}) => {
    const text = events.map((e) => `data: ${typeof e === "string" ? e : JSON.stringify(e)}\n\n`).join("");
    const bytes = new TextEncoder().encode(text);
    const stream = new ReadableStream({
        start(controller) {
            for (let i = 0; i < bytes.length; i += splitAt) controller.enqueue(bytes.slice(i, i + splitAt));
            controller.close();
        },
    });
    return new Response(stream, { status, headers: { "Content-Type": "text/event-stream" } });
};
const groqChunk = (content) => ({ choices: [{ delta: { content } }] });
const geminiChunk = (text, extra = {}) => ({ candidates: [{ content: { parts: [{ text }] }, ...extra }] });

const body = {
    problemTitle: "Two Sum",
    problemDescription: "Return indices of two numbers adding to target.",
    language: "javascript",
    code: "function twoSum(nums, target) {}",
    level: 1,
};
const parseSse = (text) =>
    text
        .split("\n\n")
        .filter((l) => l.startsWith("data: "))
        .map((l) => JSON.parse(l.slice(6)));

let mongod;
let app;
let fetchMock;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    app = createApp();
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongod?.stop();
});
beforeEach(async () => {
    await User.deleteMany({});
    clearUserCache();
    await User.create({ clerkId: "u1", name: "U", email: "u1@example.com" });
    // supertest itself uses http, not fetch, so only provider calls hit this mock
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    Object.assign(ENV, { GROQ_API_KEY: "", GEMINI_API_KEY: "" });
});
afterEach(() => {
    globalThis.fetch = realFetch;
    Object.assign(ENV, { GROQ_API_KEY: "", GEMINI_API_KEY: "" });
});

const post = (path, payload = body, user = "u1") => {
    const r = request(app).post(`/api/ai/${path}`).send(payload);
    return user ? r.set("x-test-user", user) : r;
};

describe("AI endpoints", () => {
    it("require auth", async () => {
        expect((await post("hint", body, null)).status).toBe(401);
    });

    it("return 503 when no provider key is set", async () => {
        const res = await post("hint");
        expect(res.status).toBe(503);
        expect(res.body.message).toMatch(/GROQ_API_KEY or GEMINI_API_KEY/);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([
        [{ ...body, level: 4 }, /level/],
        [{ ...body, language: "ruby" }, /language/],
        [{ ...body, problemTitle: "" }, /problemTitle/],
        [{ ...body, code: 42 }, /code/],
        [{ ...body, code: "x".repeat(20001) }, /too long/],
    ])("validate hint input %#", async (payload, msg) => {
        ENV.GROQ_API_KEY = "k";
        const res = await post("hint", payload);
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(msg);
    });

    it("rejects a review of empty code", async () => {
        ENV.GROQ_API_KEY = "k";
        expect((await post("review", { ...body, code: "   " })).status).toBe(400);
    });
});

describe("Groq provider", () => {
    beforeEach(() => {
        ENV.GROQ_API_KEY = "groq-key";
        ENV.GEMINI_API_KEY = "gemini-key"; // Groq wins when both are set
    });

    it("streams a hint and sends the right request", async () => {
        fetchMock.mockResolvedValue(sseResponse([groqChunk("Think about "), groqChunk("a hash map."), "[DONE]"]));
        const res = await post("hint", { ...body, level: 2, problemTitle: 'Two "Sum"' });

        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
        expect(parseSse(res.text)).toEqual([{ text: "Think about " }, { text: "a hash map." }, { done: true }]);

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
        expect(init.headers.Authorization).toBe("Bearer groq-key");
        const sent = JSON.parse(init.body);
        expect(sent.stream).toBe(true);
        expect(sent.model).toBe(ENV.GROQ_MODEL);
        expect(sent.messages[0].content).toMatch(/Never give the full solution/);
        expect(sent.messages[1].content).toContain("hint level 2 of 3");
        expect(sent.messages[1].content).toContain("title=\"Two 'Sum'\"");
        expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it("uses the review prompt for /review", async () => {
        fetchMock.mockResolvedValue(sseResponse([groqChunk("### Correctness\nok"), "[DONE]"]));
        const res = await post("review");
        expect(parseSse(res.text)[0].text).toContain("Correctness");
        expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages[0].content).toMatch(/Score: N\/10/);
    });

    it("turns a provider 429 into a friendly error event", async () => {
        fetchMock.mockResolvedValue(new Response("rate limited", { status: 429 }));
        const events = parseSse((await post("hint")).text);
        expect(events).toEqual([{ error: "The AI service is busy. Try again in a moment." }]);
    });

    it("handles network failures", async () => {
        fetchMock.mockRejectedValue(new TypeError("fetch failed"));
        const events = parseSse((await post("hint")).text);
        expect(events).toEqual([{ error: "Could not reach the AI service" }]);
    });

    it("skips malformed chunks", async () => {
        fetchMock.mockResolvedValue(sseResponse(["{not json", groqChunk("ok"), "[DONE]"]));
        expect(parseSse((await post("hint")).text)).toEqual([{ text: "ok" }, { done: true }]);
    });
});

describe("Gemini provider", () => {
    beforeEach(() => {
        ENV.GEMINI_API_KEY = "gemini-key";
    });

    it("streams text and sends a Gemini request", async () => {
        fetchMock.mockResolvedValue(sseResponse([geminiChunk("Use "), geminiChunk("two pointers.", { finishReason: "STOP" })]));
        const res = await post("hint");
        expect(parseSse(res.text)).toEqual([{ text: "Use " }, { text: "two pointers." }, { done: true }]);

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toContain(`/models/${ENV.GEMINI_MODEL}:streamGenerateContent?alt=sse`);
        expect(init.headers["x-goog-api-key"]).toBe("gemini-key");
        const sent = JSON.parse(init.body);
        expect(sent.systemInstruction.parts[0].text).toMatch(/Never give the full solution/);
        expect(sent.contents[0].parts[0].text).toContain("hint level 1 of 3");
    });

    it("reports safety blocks", async () => {
        fetchMock.mockResolvedValue(sseResponse([{ promptFeedback: { blockReason: "SAFETY" } }]));
        const events = parseSse((await post("hint")).text);
        expect(events).toEqual([{ error: "The AI couldn't answer this request." }, { done: true }]);
    });

    it("ignores thought parts", async () => {
        fetchMock.mockResolvedValue(
            sseResponse([{ candidates: [{ content: { parts: [{ text: "secret plan", thought: true }, { text: "Hint!" }] } }] }])
        );
        expect(parseSse((await post("hint")).text)).toEqual([{ text: "Hint!" }, { done: true }]);
    });
});
