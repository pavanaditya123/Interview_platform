import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { createApp } from "../src/app.js";
import { ENV } from "../src/lib/env.js";
import User from "../src/models/User.js";
import MockInterview from "../src/models/MockInterview.js";
import { clearUserCache } from "../src/middleware/protectRoute.js";
import { splitReport } from "../src/lib/mockPrompts.js";

const realFetch = globalThis.fetch;
let mongod;
let app;
let fetchMock;

const as = (id) => ({ "x-test-user": id });
const groqStream = (text) =>
    new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`, {
        headers: { "Content-Type": "text/event-stream" },
    });
const sentBody = (call) => JSON.parse(fetchMock.mock.calls[call][1].body);

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
    await Promise.all([User.deleteMany({}), MockInterview.deleteMany({})]);
    clearUserCache();
    await User.create([
        { clerkId: "me", name: "Me", email: "me@example.com" },
        { clerkId: "other", name: "Other", email: "o@example.com" },
    ]);
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    ENV.GROQ_API_KEY = "k";
});
afterEach(() => {
    globalThis.fetch = realFetch;
    ENV.GROQ_API_KEY = "";
});

const create = (extra = {}) =>
    request(app)
        .post("/api/mock-interviews")
        .set(as("me"))
        .send({ role: "Frontend Engineer", level: "Junior", focus: "technical", totalQuestions: 3, resumeText: "React, TypeScript, built a todo app", ...extra });
const turn = (id, answer, user = "me") => request(app).post(`/api/mock-interviews/${id}/turn`).set(as(user)).send(answer ? { answer } : {});

describe("creating mock interviews", () => {
    it("validates input", async () => {
        expect((await create({ role: "" })).status).toBe(400);
        expect((await create({ totalQuestions: 2 })).status).toBe(400);
        expect((await create({ totalQuestions: 11 })).status).toBe(400);
        expect((await create({ resumeText: "x".repeat(15001) })).status).toBe(400);
    });

    it("creates and lists only my interviews, without resume text in the list", async () => {
        const res = await create({ focus: "nonsense" });
        expect(res.status).toBe(201);
        expect(res.body.interview.focus).toBe("mixed");
        const mine = await request(app).get("/api/mock-interviews").set(as("me"));
        expect(mine.body.interviews).toHaveLength(1);
        expect(mine.body.interviews[0].resumeText).toBeUndefined();
        expect((await request(app).get("/api/mock-interviews").set(as("other"))).body.interviews).toHaveLength(0);
    });

    it("keeps interviews private to their owner", async () => {
        const id = (await create()).body.interview._id;
        expect((await request(app).get(`/api/mock-interviews/${id}`).set(as("other"))).status).toBe(403);
        expect((await turn(id, null, "other")).status).toBe(403);
        expect((await request(app).post(`/api/mock-interviews/${id}/report`).set(as("other"))).status).toBe(403);
    });
});

describe("running an interview", () => {
    it("asks questions turn by turn, then closes and completes", async () => {
        const id = (await create()).body.interview._id;

        fetchMock.mockResolvedValueOnce(groqStream("Hi, I'm Ava. Question 1: what is the virtual DOM?"));
        await turn(id);
        let sys = sentBody(0).messages[0].content;
        expect(sys).toContain("This is the start");
        expect(sys).toContain("React, TypeScript, built a todo app");
        expect(sys).toContain("Frontend Engineer");

        // answer is required once the interviewer has spoken
        expect((await turn(id)).status).toBe(400);

        fetchMock.mockResolvedValueOnce(groqStream("Q2?"));
        await turn(id, "It is an in-memory tree");
        const turns = sentBody(1).messages;
        expect(turns.at(-1)).toEqual({ role: "user", content: "It is an in-memory tree" });
        expect(turns.at(-2)).toEqual({ role: "assistant", content: "Hi, I'm Ava. Question 1: what is the virtual DOM?" });
        expect(sentBody(1).messages[0].content).toContain("asked 1 of 3");

        fetchMock.mockResolvedValueOnce(groqStream("Q3?"));
        await turn(id, "answer 2");
        fetchMock.mockResolvedValueOnce(groqStream("Thanks, that's the end."));
        await turn(id, "answer 3");
        expect(sentBody(3).messages[0].content).toContain("Close the interview now");

        const { body } = await request(app).get(`/api/mock-interviews/${id}`).set(as("me"));
        expect(body.interview.status).toBe("completed");
        expect(body.interview.messages.map((m) => m.role)).toEqual([
            "interviewer", "candidate", "interviewer", "candidate", "interviewer", "candidate", "interviewer",
        ]);
        expect((await turn(id, "more")).status).toBe(400);
    });

    it("keeps the answer and lets the candidate retry when the AI fails", async () => {
        const id = (await create()).body.interview._id;
        fetchMock.mockResolvedValueOnce(groqStream("Q1?"));
        await turn(id);
        fetchMock.mockResolvedValueOnce(new Response("down", { status: 500 }));
        const failed = await turn(id, "my answer");
        expect(failed.text).toContain("error");

        fetchMock.mockResolvedValueOnce(groqStream("Q2?"));
        await turn(id); // retry without resending the answer
        const { body } = await request(app).get(`/api/mock-interviews/${id}`).set(as("me"));
        expect(body.interview.messages.map((m) => m.content)).toEqual(["Q1?", "my answer", "Q2?"]);
    });

    it("can be finished early and then generates a scored report for the candidate", async () => {
        const id = (await create()).body.interview._id;
        expect((await request(app).post(`/api/mock-interviews/${id}/report`).set(as("me"))).status).toBe(400);

        fetchMock.mockResolvedValueOnce(groqStream("Q1?"));
        await turn(id);
        fetchMock.mockResolvedValueOnce(groqStream("Q2?"));
        await turn(id, "my only answer");
        await request(app).post(`/api/mock-interviews/${id}/finish`).set(as("me"));

        const report = '### Overall\nGood start.\n### Where you lacked\n- depth\n```json\n{"overall": 6, "communication": 8, "technicalDepth": 4.6, "problemSolving": 5, "relevance": 7, "confidence": 99}\n```';
        fetchMock.mockResolvedValueOnce(groqStream(report));
        const res = await request(app).post(`/api/mock-interviews/${id}/report`).set(as("me"));
        expect(res.headers["content-type"]).toMatch(/event-stream/);
        expect(sentBody(2).messages[1].content).toContain("Candidate: my only answer");

        const { body } = await request(app).get(`/api/mock-interviews/${id}`).set(as("me"));
        expect(body.interview.report).toBe("### Overall\nGood start.\n### Where you lacked\n- depth");
        expect(body.interview.scores).toEqual({ overall: 6, communication: 8, technicalDepth: 5, problemSolving: 5, relevance: 7, confidence: 10 });
    });
});

describe("splitReport", () => {
    it("keeps the text when the score block is missing or malformed", () => {
        expect(splitReport("### Overall\nok")).toEqual({ report: "### Overall\nok", scores: {} });
        expect(splitReport("text\n```json\n{bad\n```").report).toBe("text");
    });
});
