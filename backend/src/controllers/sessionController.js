import mongoose from "mongoose";
import crypto from "crypto";
import Session from "../models/Session.js";
import { streamClient, chatClient } from "../lib/stream.js";

const USER_FIELDS = "name profileImage email clerkId";
const DIFFICULTIES = ["easy", "medium", "hard"];

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const clampLimit = (value, fallback = 20, max = 50) => {
    const n = Number.parseInt(value, 10);
    if (Number.isNaN(n) || n <= 0) return fallback;
    return Math.min(n, max);
};

export async function createSession(req, res) {
    try {
        const { problem, difficulty } = req.body ?? {};
        const userId = req.user._id;
        const clerkId = req.user.clerkId;

        if (!problem || !difficulty) {
            return res.status(400).json({ message: "problem and difficulty are required" });
        }
        const normalizedDifficulty = String(difficulty).toLowerCase();
        if (!DIFFICULTIES.includes(normalizedDifficulty)) {
            return res.status(400).json({ message: "difficulty must be easy, medium or hard" });
        }

        // A user may only host one active session at a time.
        const existing = await Session.findOne({ host: userId, status: "active" }).lean();
        if (existing) {
            return res.status(409).json({
                message: "You already have an active session. End it before creating a new one.",
                session: existing,
            });
        }

        const callId = `session_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

        const session = await Session.create({
            problem: String(problem),
            difficulty: normalizedDifficulty,
            host: userId,
            callId,
        });

        try {
            await streamClient.video.call("default", callId).getOrCreate({
                data: {
                    created_by_id: clerkId,
                    custom: { problem, difficulty: normalizedDifficulty, sessionId: session._id.toString() },
                },
            });

            const channel = chatClient.channel("messaging", callId, {
                name: `${problem} Session`,
                created_by_id: clerkId,
                members: [clerkId],
            });
            await channel.create();
        } catch (streamError) {
            // Roll back so we never leave a DB session without a call/channel.
            await Session.deleteOne({ _id: session._id });
            throw streamError;
        }

        res.status(201).json({ session });
    } catch (error) {
        console.log("Error in createSession controller:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getActiveSessions(req, res) {
    try {
        const limit = clampLimit(req.query.limit);
        const sessions = await Session.find({ status: "active" })
            .populate("host", USER_FIELDS)
            .populate("participant", USER_FIELDS)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        res.set("Cache-Control", "private, max-age=5");
        res.status(200).json({ sessions });
    } catch (error) {
        console.log("Error in getActiveSessions controller:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getPastSessions(req, res) {
    try {
        const userId = req.user._id;
        const limit = clampLimit(req.query.limit);
        const sessions = await Session.find({
            status: "completed",
            $or: [{ host: userId }, { participant: userId }],
        })
            .populate("host", USER_FIELDS)
            .populate("participant", USER_FIELDS)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        res.status(200).json({ sessions });
    } catch (error) {
        console.log("Error in getPastSessions controller:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getSessionById(req, res) {
    try {
        const { id } = req.params;
        if (!isValidId(id)) {
            return res.status(400).json({ message: "Invalid session id" });
        }

        const session = await Session.findById(id)
            .populate("host", USER_FIELDS)
            .populate("participant", USER_FIELDS)
            .lean();

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        res.status(200).json({ session });
    } catch (error) {
        console.log("Error in getSessionById controller:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function joinSession(req, res) {
    try {
        const { id } = req.params;
        const clerkId = req.user.clerkId;
        const userId = req.user._id;

        if (!isValidId(id)) {
            return res.status(400).json({ message: "Invalid session id" });
        }

        const session = await Session.findById(id).lean();
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }
        if (session.status !== "active") {
            return res.status(400).json({ message: "Cannot join a completed session" });
        }
        if (session.host.toString() === userId.toString()) {
            return res.status(400).json({ message: "Host cannot join their own session as participant" });
        }
        if (session.participant) {
            if (session.participant.toString() === userId.toString()) {
                return res.status(200).json({ session });
            }
            return res.status(409).json({ message: "Session is full" });
        }

        // Atomic claim: only one concurrent request can fill the participant slot.
        const updated = await Session.findOneAndUpdate(
            { _id: id, status: "active", participant: null },
            { $set: { participant: userId } },
            { new: true }
        ).lean();

        if (!updated) {
            return res.status(409).json({ message: "Session is full" });
        }

        const channel = chatClient.channel("messaging", session.callId);
        await channel.addMembers([clerkId]);

        res.status(200).json({ session: updated });
    } catch (error) {
        console.log("Error in joinSession controller:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function endSession(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        if (!isValidId(id)) {
            return res.status(400).json({ message: "Invalid session id" });
        }

        const session = await Session.findById(id);
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }
        if (session.host.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Only the host can end the session" });
        }
        if (session.status === "completed") {
            return res.status(400).json({ message: "Session is already completed" });
        }

        session.status = "completed";
        await session.save();

        // Clean up Stream resources; a failure here should not undo ending the session.
        const results = await Promise.allSettled([
            streamClient.video.call("default", session.callId).delete({ hard: true }),
            chatClient.channel("messaging", session.callId).delete(),
        ]);
        results
            .filter((r) => r.status === "rejected")
            .forEach((r) => console.log("Stream cleanup failed:", r.reason?.message));

        res.status(200).json({ session, message: "Session ended successfully" });
    } catch (error) {
        console.log("Error in endSession controller:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
