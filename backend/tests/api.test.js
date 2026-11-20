import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { createApp } from "../src/app.js";
import User from "../src/models/User.js";
import Session from "../src/models/Session.js";
import { clearUserCache } from "../src/middleware/protectRoute.js";
import { __mocks } from "../src/lib/stream.js";

let mongod;
let app;

const as = (clerkId) => ({ "x-test-user": clerkId });

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    await Session.syncIndexes();
    app = createApp();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod?.stop();
});

beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Session.deleteMany({})]);
    clearUserCache();
    vi.clearAllMocks();
    await User.create([
        { clerkId: "host_1", name: "Host", email: "host@example.com" },
        { clerkId: "guest_1", name: "Guest", email: "guest@example.com" },
        { clerkId: "guest_2", name: "Guest Two", email: "guest2@example.com" },
    ]);
});

const createSession = (clerkId = "host_1", body = { problem: "Two Sum", difficulty: "easy" }) =>
    request(app).post("/api/sessions").set(as(clerkId)).send(body);

describe("health + routing", () => {
    it("GET /health responds without auth", async () => {
        const res = await request(app).get("/health");
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
        expect(res.body.db).toBe("connected");
    });

    it("unknown /api routes return JSON 404", async () => {
        const res = await request(app).get("/api/nope").set(as("host_1"));
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/not found/i);
    });

    it("responses are compressed when large enough", async () => {
        const res = await request(app).get("/api/sessions/active").set(as("host_1")).set("Accept-Encoding", "gzip");
        expect(res.status).toBe(200);
    });

    it("sets security headers", async () => {
        const res = await request(app).get("/health");
        expect(res.headers["x-powered-by"]).toBeUndefined();
        expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });
});

describe("auth", () => {
    it("rejects unauthenticated requests", async () => {
        const res = await request(app).get("/api/sessions/active");
        expect(res.status).toBe(401);
    });

    it("returns 404 when the Clerk user is not synced to the DB", async () => {
        const res = await request(app).get("/api/sessions/active").set(as("ghost"));
        expect(res.status).toBe(404);
    });
});

describe("chat token", () => {
    it("returns a stream token with the user's profile image", async () => {
        await User.updateOne({ clerkId: "host_1" }, { profileImage: "http://img/x.png" });
        const res = await request(app).get("/api/chat/token").set(as("host_1"));
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            token: "token-for-host_1",
            userId: "host_1",
            userName: "Host",
            userImage: "http://img/x.png",
        });
    });
});

describe("sessions", () => {
    it("creates a session with a Stream call and chat channel", async () => {
        const res = await createSession();
        expect(res.status).toBe(201);
        expect(res.body.session).toMatchObject({ problem: "Two Sum", difficulty: "easy", status: "active" });
        expect(res.body.session.callId).toMatch(/^session_/);
        expect(__mocks.call.getOrCreate).toHaveBeenCalledOnce();
        expect(__mocks.channel.create).toHaveBeenCalledOnce();
    });

    it("validates input", async () => {
        expect((await createSession("host_1", {})).status).toBe(400);
        expect((await createSession("host_1", { problem: "X", difficulty: "insane" })).status).toBe(400);
    });

    it("accepts capitalised difficulty from the problem catalogue", async () => {
        const res = await createSession("host_1", { problem: "Two Sum", difficulty: "Easy" });
        expect(res.status).toBe(201);
        expect(res.body.session.difficulty).toBe("easy");
    });

    it("prevents a host from running two active sessions", async () => {
        await createSession();
        const res = await createSession();
        expect(res.status).toBe(409);
    });

    it("rolls back the DB session if Stream fails", async () => {
        __mocks.call.getOrCreate.mockRejectedValueOnce(new Error("stream down"));
        const res = await createSession();
        expect(res.status).toBe(500);
        expect(await Session.countDocuments()).toBe(0);
    });

    it("lists active sessions with populated host", async () => {
        await createSession();
        const res = await request(app).get("/api/sessions/active").set(as("guest_1"));
        expect(res.status).toBe(200);
        expect(res.body.sessions).toHaveLength(1);
        expect(res.body.sessions[0].host.name).toBe("Host");
    });

    it("gets a session by id and handles bad ids", async () => {
        const { body } = await createSession();
        const ok = await request(app).get(`/api/sessions/${body.session._id}`).set(as("guest_1"));
        expect(ok.status).toBe(200);
        expect(ok.body.session.host.clerkId).toBe("host_1");

        expect((await request(app).get("/api/sessions/not-an-id").set(as("guest_1"))).status).toBe(400);
        const missing = new mongoose.Types.ObjectId().toString();
        expect((await request(app).get(`/api/sessions/${missing}`).set(as("guest_1"))).status).toBe(404);
    });

    it("lets one participant join, rejects host and a second guest", async () => {
        const { body } = await createSession();
        const id = body.session._id;

        expect((await request(app).post(`/api/sessions/${id}/join`).set(as("host_1"))).status).toBe(400);

        const join = await request(app).post(`/api/sessions/${id}/join`).set(as("guest_1"));
        expect(join.status).toBe(200);
        expect(__mocks.channel.addMembers).toHaveBeenCalledWith(["guest_1"]);

        // Rejoining is idempotent for the same participant.
        expect((await request(app).post(`/api/sessions/${id}/join`).set(as("guest_1"))).status).toBe(200);

        expect((await request(app).post(`/api/sessions/${id}/join`).set(as("guest_2"))).status).toBe(409);
    });

    it("only allows one of two concurrent joins to win", async () => {
        const { body } = await createSession();
        const id = body.session._id;
        const [a, b] = await Promise.all([
            request(app).post(`/api/sessions/${id}/join`).set(as("guest_1")),
            request(app).post(`/api/sessions/${id}/join`).set(as("guest_2")),
        ]);
        expect([a.status, b.status].sort()).toEqual([200, 409]);
    });

    it("only the host can end; ended sessions show in past sessions for both users", async () => {
        const { body } = await createSession();
        const id = body.session._id;
        await request(app).post(`/api/sessions/${id}/join`).set(as("guest_1"));

        expect((await request(app).post(`/api/sessions/${id}/end`).set(as("guest_1"))).status).toBe(403);

        const end = await request(app).post(`/api/sessions/${id}/end`).set(as("host_1"));
        expect(end.status).toBe(200);
        expect(end.body.session.status).toBe("completed");
        expect(__mocks.call.end).toHaveBeenCalledOnce(); // ended, not deleted, so recordings survive
        expect(__mocks.call.delete).not.toHaveBeenCalled();

        expect((await request(app).post(`/api/sessions/${id}/end`).set(as("host_1"))).status).toBe(400);
        expect((await request(app).post(`/api/sessions/${id}/join`).set(as("guest_2"))).status).toBe(400);

        for (const user of ["host_1", "guest_1"]) {
            const past = await request(app).get("/api/sessions/my-recent").set(as(user));
            expect(past.status).toBe(200);
            expect(past.body.sessions).toHaveLength(1);
        }
        const other = await request(app).get("/api/sessions/my-recent").set(as("guest_2"));
        expect(other.body.sessions).toHaveLength(0);
    });

    it("still ends the session when Stream cleanup fails", async () => {
        const { body } = await createSession();
        __mocks.call.end.mockRejectedValueOnce(new Error("gone"));
        const end = await request(app).post(`/api/sessions/${body.session._id}/end`).set(as("host_1"));
        expect(end.status).toBe(200);
    });

    it("caps the list limit", async () => {
        const res = await request(app).get("/api/sessions/active?limit=99999").set(as("host_1"));
        expect(res.status).toBe(200);
    });
});

describe("code execution proxy", () => {
    it("validates language and code", async () => {
        const bad = await request(app).post("/api/code/execute").set(as("host_1")).send({ language: "cobol", code: "x" });
        expect(bad.status).toBe(400);
        const empty = await request(app).post("/api/code/execute").set(as("host_1")).send({ language: "java", code: "" });
        expect(empty.status).toBe(400);
    });

    it("returns 503 when no Piston server is configured", async () => {
        const res = await request(app).post("/api/code/execute").set(as("host_1")).send({ language: "java", code: "class A{}" });
        expect(res.status).toBe(503);
    });

    it("rejects oversized JSON bodies", async () => {
        const res = await request(app)
            .post("/api/code/execute")
            .set(as("host_1"))
            .send({ language: "java", code: "x".repeat(200 * 1024) });
        expect(res.status).toBe(413);
    });
});
