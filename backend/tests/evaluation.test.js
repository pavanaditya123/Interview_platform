import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { createApp } from "../src/app.js";
import { ENV } from "../src/lib/env.js";
import User from "../src/models/User.js";
import Session from "../src/models/Session.js";
import Evaluation from "../src/models/Evaluation.js";
import { clearUserCache } from "../src/middleware/protectRoute.js";
import { __mocks } from "../src/lib/stream.js";

const realFetch = globalThis.fetch;
let mongod;
let app;

const as = (id) => ({ "x-test-user": id });
const parseSse = (text) =>
    text
        .split("\n\n")
        .filter((l) => l.startsWith("data: "))
        .map((l) => JSON.parse(l.slice(6)));
const groqStream = (parts) =>
    new Response(
        parts.map((p) => `data: ${JSON.stringify({ choices: [{ delta: { content: p } }] })}\n\n`).join("") + "data: [DONE]\n\n",
        { headers: { "Content-Type": "text/event-stream" } }
    );

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
    await Promise.all([User.deleteMany({}), Session.deleteMany({}), Evaluation.deleteMany({})]);
    clearUserCache();
    vi.clearAllMocks();
    await User.create([
        { clerkId: "host", name: "Host", email: "h@example.com" },
        { clerkId: "cand", name: "Candy Date", email: "c@example.com" },
        { clerkId: "other", name: "Other", email: "o@example.com" },
    ]);
});
afterEach(() => {
    globalThis.fetch = realFetch;
    ENV.GROQ_API_KEY = "";
});

const createSession = (extra = {}) =>
    request(app)
        .post("/api/sessions")
        .set(as("host"))
        .send({
            problem: "Two Sum",
            difficulty: "easy",
            durationMinutes: 45,
            requirements: { role: "Backend Engineer", level: "Mid", skills: "Node.js, MongoDB" },
            ...extra,
        });

const fullInterview = async () => {
    const { body } = await createSession();
    const id = body.session._id;
    await request(app).post(`/api/sessions/${id}/join`).set(as("cand"));
    return id;
};

describe("timed sessions", () => {
    it("stores the time limit and validates it", async () => {
        const { body } = await createSession();
        expect(body.session.durationMinutes).toBe(45);
        await request(app).post(`/api/sessions/${body.session._id}/end`).set(as("host"));
        expect((await createSession({ durationMinutes: 500 })).status).toBe(400);
        expect((await createSession({ durationMinutes: 1.5 })).status).toBe(400);
    });
});

describe("interviewer evaluation privacy", () => {
    it("only the host can read or edit the evaluation", async () => {
        const id = await fullInterview();
        for (const user of ["cand", "other"]) {
            expect((await request(app).get(`/api/sessions/${id}/evaluation`).set(as(user))).status).toBe(403);
            expect((await request(app).patch(`/api/sessions/${id}/evaluation`).set(as(user)).send({ notes: "x" })).status).toBe(403);
            expect((await request(app).post(`/api/sessions/${id}/report`).set(as(user))).status).toBe(403);
            expect((await request(app).get(`/api/sessions/${id}/recordings`).set(as(user))).status).toBe(403);
        }
    });

    it("never exposes interviewer data on the public session endpoints", async () => {
        const id = await fullInterview();
        await request(app).patch(`/api/sessions/${id}/evaluation`).set(as("host")).send({ notes: "SECRET NOTE" });
        for (const path of [`/api/sessions/${id}`, "/api/sessions/active"]) {
            const res = await request(app).get(path).set(as("cand"));
            expect(JSON.stringify(res.body)).not.toMatch(/SECRET NOTE|Backend Engineer|evaluation/);
        }
    });

    it("saves requirements at creation and lets the host update notes, scores and recommendation", async () => {
        const id = await fullInterview();
        const get = await request(app).get(`/api/sessions/${id}/evaluation`).set(as("host"));
        expect(get.status).toBe(200);
        expect(get.body.evaluation.requirements).toEqual({ role: "Backend Engineer", level: "Mid", skills: "Node.js, MongoDB" });

        const patch = await request(app)
            .patch(`/api/sessions/${id}/evaluation`)
            .set(as("host"))
            .send({
                notes: "Explained hash map approach clearly",
                scores: { problemSolving: 4, communication: 5, codeQuality: 9, bogus: 3 },
                recommendation: "hire",
                host: "someone-else",
                report: "forged",
            });
        expect(patch.status).toBe(200);
        expect(patch.body.evaluation.notes).toBe("Explained hash map approach clearly");
        expect(patch.body.evaluation.scores).toMatchObject({ problemSolving: 4, communication: 5, codeQuality: 0 });
        expect(patch.body.evaluation.scores.bogus).toBeUndefined();
        expect(patch.body.evaluation.recommendation).toBe("hire");
        expect(patch.body.evaluation.report).toBe(""); // not editable
    });

    it("snapshots the final code when the host ends the session", async () => {
        const id = await fullInterview();
        await request(app)
            .post(`/api/sessions/${id}/end`)
            .set(as("host"))
            .send({ finalCode: "function twoSum(){ return [0,1] }", finalLanguage: "javascript" });
        const { body } = await request(app).get(`/api/sessions/${id}/evaluation`).set(as("host"));
        expect(body.evaluation.finalCode).toContain("twoSum");
        expect(body.evaluation.finalLanguage).toBe("javascript");
    });
});

describe("AI interview report", () => {
    it("requires the session to be finished and AI to be configured", async () => {
        const id = await fullInterview();
        expect((await request(app).post(`/api/sessions/${id}/report`).set(as("host"))).status).toBe(503);
        ENV.GROQ_API_KEY = "k";
        expect((await request(app).post(`/api/sessions/${id}/report`).set(as("host"))).status).toBe(400);
    });

    it("streams the report, includes all evaluation data in the prompt, and saves it", async () => {
        const id = await fullInterview();
        await request(app)
            .patch(`/api/sessions/${id}/evaluation`)
            .set(as("host"))
            .send({ notes: "Missed empty input", scores: { problemSolving: 3 }, recommendation: "lean_hire" });
        await request(app)
            .post(`/api/sessions/${id}/end`)
            .set(as("host"))
            .send({ finalCode: "const x = 1;", finalLanguage: "javascript" });

        ENV.GROQ_API_KEY = "k";
        const fetchMock = vi.fn().mockResolvedValue(groqStream(["### Summary\nSolid. ", "### AI score\nAI score: 7/10"]));
        globalThis.fetch = fetchMock;

        const res = await request(app).post(`/api/sessions/${id}/report`).set(as("host"));
        expect(res.headers["content-type"]).toMatch(/event-stream/);
        expect(parseSse(res.text).at(-1)).toEqual({ done: true });

        const prompt = JSON.parse(fetchMock.mock.calls[0][1].body).messages[1].content;
        for (const expected of ["Backend Engineer", "Node.js, MongoDB", "Missed empty input", "const x = 1;", "Problem solving: 3/5", "Candy Date", "lean_hire", "time limit 45 minutes"]) {
            expect(prompt).toContain(expected);
        }

        const { body } = await request(app).get(`/api/sessions/${id}/evaluation`).set(as("host"));
        expect(body.evaluation.report).toBe("### Summary\nSolid. ### AI score\nAI score: 7/10");
        expect(body.evaluation.reportGeneratedAt).toBeTruthy();
    });
});

describe("interviewer dashboard and recordings", () => {
    it("lists hosted sessions with score summary, only for the host", async () => {
        const id = await fullInterview();
        await request(app)
            .patch(`/api/sessions/${id}/evaluation`)
            .set(as("host"))
            .send({ scores: { problemSolving: 4, communication: 3 }, recommendation: "hire" });
        await request(app).post(`/api/sessions/${id}/end`).set(as("host"));

        const res = await request(app).get("/api/sessions/hosted").set(as("host"));
        expect(res.status).toBe(200);
        expect(res.body.sessions).toHaveLength(1);
        expect(res.body.sessions[0].participant.name).toBe("Candy Date");
        expect(res.body.sessions[0].evaluation).toMatchObject({ role: "Backend Engineer", recommendation: "hire", averageScore: 3.5, hasReport: false });

        const cand = await request(app).get("/api/sessions/hosted").set(as("cand"));
        expect(cand.body.sessions).toHaveLength(0);
    });

    it("returns recordings for the host", async () => {
        const id = await fullInterview();
        __mocks.call.listRecordings.mockResolvedValueOnce({
            recordings: [{ filename: "a.mp4", url: "https://x/a.mp4", start_time: "t1", end_time: "t2" }],
        });
        const res = await request(app).get(`/api/sessions/${id}/recordings`).set(as("host"));
        expect(res.body.recordings).toEqual([{ filename: "a.mp4", url: "https://x/a.mp4", startTime: "t1", endTime: "t2" }]);
    });
});

describe("synced progress", () => {
    it("merges solved problems idempotently and validates ids", async () => {
        const add = await request(app).post("/api/users/me/progress").set(as("cand")).send({ problemIds: ["two-sum", "two-sum", "Bad Id!"] });
        expect(add.body.solvedProblems).toEqual(["two-sum"]);
        await request(app).post("/api/users/me/progress").set(as("cand")).send({ problemIds: ["merge-intervals"] });
        const get = await request(app).get("/api/users/me/progress").set(as("cand"));
        expect(get.body.solvedProblems).toEqual(["two-sum", "merge-intervals"]);
        expect((await request(app).post("/api/users/me/progress").set(as("cand")).send({})).status).toBe(400);
        expect((await request(app).get("/api/users/me/progress").set(as("other"))).body.solvedProblems).toEqual([]);
    });
});
