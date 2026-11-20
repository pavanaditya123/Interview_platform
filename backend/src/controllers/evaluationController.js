import mongoose from "mongoose";
import Session from "../models/Session.js";
import Evaluation, { RECOMMENDATIONS, SCORE_KEYS } from "../models/Evaluation.js";
import { streamClient } from "../lib/stream.js";
import { isAiConfigured } from "../lib/ai.js";
import { REPORT_SYSTEM, reportPrompt } from "../lib/reportPrompt.js";
import { notConfigured, streamToClient } from "./aiController.js";

const USER_FIELDS = "name profileImage email clerkId";
const LANGUAGES = ["javascript", "python", "java"];

// Loads the session and checks the caller is its host. Returns null after responding on failure.
async function loadHostedSession(req, res) {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Invalid session id" });
        return null;
    }
    const session = await Session.findById(id).populate("host", USER_FIELDS).populate("participant", USER_FIELDS).lean();
    if (!session) {
        res.status(404).json({ message: "Session not found" });
        return null;
    }
    if (session.host._id.toString() !== req.user._id.toString()) {
        res.status(403).json({ message: "Only the interviewer can access this" });
        return null;
    }
    return session;
}

const getOrCreateEvaluation = (session) =>
    Evaluation.findOneAndUpdate(
        { session: session._id },
        { $setOnInsert: { session: session._id, host: session.host._id } },
        { upsert: true, new: true }
    ).lean();

// Whitelists and clamps the editable fields.
export function sanitizeEvaluationUpdate(body = {}) {
    const update = {};
    const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : undefined);

    if (body.requirements && typeof body.requirements === "object") {
        for (const [key, max] of [["role", 120], ["level", 60], ["skills", 2000]]) {
            const v = str(body.requirements[key], max);
            if (v !== undefined) update[`requirements.${key}`] = v;
        }
    }
    const notes = str(body.notes, 20000);
    if (notes !== undefined) update.notes = notes;

    if (body.scores && typeof body.scores === "object") {
        for (const key of SCORE_KEYS) {
            const n = Number(body.scores[key]);
            if (Number.isInteger(n) && n >= 0 && n <= 5) update[`scores.${key}`] = n;
        }
    }
    if (RECOMMENDATIONS.includes(body.recommendation)) update.recommendation = body.recommendation;

    const finalCode = str(body.finalCode, 20000);
    if (finalCode !== undefined) update.finalCode = finalCode;
    if (LANGUAGES.includes(body.finalLanguage)) update.finalLanguage = body.finalLanguage;
    return update;
}

export async function getEvaluation(req, res) {
    try {
        const session = await loadHostedSession(req, res);
        if (!session) return;
        const evaluation = await getOrCreateEvaluation(session);
        res.status(200).json({ session, evaluation, aiEnabled: isAiConfigured() });
    } catch (error) {
        console.log("Error in getEvaluation:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function updateEvaluation(req, res) {
    try {
        const session = await loadHostedSession(req, res);
        if (!session) return;
        const update = sanitizeEvaluationUpdate(req.body);
        const evaluation = await Evaluation.findOneAndUpdate(
            { session: session._id },
            { $set: update, $setOnInsert: { session: session._id, host: session.host._id } },
            { upsert: true, new: true, runValidators: true }
        ).lean();
        res.status(200).json({ evaluation });
    } catch (error) {
        console.log("Error in updateEvaluation:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Streams an AI interview report (SSE) and saves it when complete.
export async function generateReport(req, res) {
    try {
        const session = await loadHostedSession(req, res);
        if (!session) return;
        if (!isAiConfigured()) return notConfigured(res);
        if (session.status !== "completed") {
            return res.status(400).json({ message: "End the session before generating the report" });
        }
        const evaluation = await getOrCreateEvaluation(session);
        const durationMins = Math.max(1, Math.round((new Date(session.updatedAt) - new Date(session.createdAt)) / 60000));

        return streamToClient(req, res, {
            system: REPORT_SYSTEM,
            prompt: reportPrompt({ session, evaluation, candidateName: session.participant?.name, durationMins }),
            maxTokens: 2500,
            onComplete: (report) =>
                Evaluation.updateOne({ session: session._id }, { $set: { report, reportGeneratedAt: new Date() } }),
        });
    } catch (error) {
        console.log("Error in generateReport:", error.message);
        if (!res.headersSent) res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getRecordings(req, res) {
    try {
        const session = await loadHostedSession(req, res);
        if (!session) return;
        const result = await streamClient.video.call("default", session.callId).listRecordings();
        const recordings = (result.recordings ?? []).map((r) => ({
            filename: r.filename,
            url: r.url,
            startTime: r.start_time,
            endTime: r.end_time,
        }));
        res.status(200).json({ recordings });
    } catch (error) {
        console.log("Error in getRecordings:", error.message);
        res.status(200).json({ recordings: [], warning: "Recordings are unavailable for this session" });
    }
}

// Interviewer dashboard: sessions I hosted, with score summary and recommendation.
export async function getHostedSessions(req, res) {
    try {
        const sessions = await Session.find({ host: req.user._id, status: "completed" })
            .populate("participant", USER_FIELDS)
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        const evaluations = await Evaluation.find({ session: { $in: sessions.map((s) => s._id) } })
            .select("session scores recommendation reportGeneratedAt requirements.role")
            .lean();
        const bySession = new Map(evaluations.map((e) => [e.session.toString(), e]));

        res.status(200).json({
            sessions: sessions.map((s) => {
                const e = bySession.get(s._id.toString());
                const scored = e ? SCORE_KEYS.map((k) => e.scores?.[k]).filter((n) => n > 0) : [];
                return {
                    ...s,
                    evaluation: e
                        ? {
                              role: e.requirements?.role ?? "",
                              recommendation: e.recommendation,
                              averageScore: scored.length ? +(scored.reduce((a, b) => a + b, 0) / scored.length).toFixed(1) : null,
                              hasReport: Boolean(e.reportGeneratedAt),
                          }
                        : null,
                };
            }),
        });
    } catch (error) {
        console.log("Error in getHostedSessions:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
