import { vi } from "vitest";

// Clerk: authenticate with an `x-test-user` header carrying the clerkId.
vi.mock("@clerk/express", () => {
    const getAuth = (req) => ({ userId: req.headers["x-test-user"] || null });
    return {
        clerkMiddleware: () => (req, _res, next) => {
            req.auth = () => getAuth(req);
            next();
        },
        requireAuth: () => (req, res, next) => {
            if (!getAuth(req).userId) return res.status(401).json({ message: "Unauthenticated" });
            next();
        },
        getAuth,
    };
});

// Stream: record calls instead of hitting the network.
vi.mock("../src/lib/stream.js", () => {
    const channel = {
        create: vi.fn().mockResolvedValue({}),
        addMembers: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
    };
    const call = {
        getOrCreate: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
    };
    return {
        streamClient: { video: { call: vi.fn(() => call) } },
        chatClient: {
            channel: vi.fn(() => channel),
            createToken: vi.fn((id) => `token-for-${id}`),
        },
        upsertStreamUser: vi.fn(),
        deleteStreamUser: vi.fn(),
        __mocks: { channel, call },
    };
});
