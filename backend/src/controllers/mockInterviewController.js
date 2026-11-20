import mongoose from "mongoose";
import MockInterview, { MOCK_FOCUS } from "../models/MockInterview.js";
import { isAiConfigured } from "../lib/ai.js";
import { interviewerSystem, reportPrompt, reportSystem, splitReport, toChatTurns } from "../lib/mockPrompts.js";
import { notConfigured, streamToClient } from "./aiController.js";

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const LIST_FIELDS = "role level focus totalQuestions status scores.overall reportGeneratedAt createdAt completedAt";

async function loadOwned(req, res) {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Invalid interview id" });
        return null;
    }
    const iv = await MockInterview.findById(id);
    if (!iv) {
        res.status(404).json({ message: "Interview not found" });
        return null;
    }
    if (iv.user.toString() !== req.user._id.toString()) {
        res.status(403).json({ message: "This interview belongs to someone else" });
        return null;
    }
    return iv;
}

export async function createMockInterview(req, res) {
    try {
        const role = str(req.body?.role, 120);
        if (!role) return res.status(400).json({ message: "role is required" });
        const focus = MOCK_FOCUS.includes(req.body?.focus) ? req.body.focus : "mixed";
        const totalQuestions = Number(req.body?.totalQuestions ?? 5);
        if (!Number.isInteger(totalQuestions) || totalQuestions < 3 || totalQuestions > 10) {
            return res.status(400).json({ message: "totalQuestions must be between 3 and 10" });
        }
        if (typeof req.body?.resumeText === "string" && req.body.resumeText.length > 15000) {
            return res.status(400).json({ message: "Resume text is too long (max 15,000 characters)" });
        }

        const iv = await MockInterview.create({
            user: req.user._id,
            role,
            level: str(req.body?.level, 60),
            focus,
            totalQuestions,
            jobDescription: str(req.body?.jobDescription, 6000),
            resumeText: str(req.body?.resumeText, 15000),
        });
        res.status(201).json({ interview: iv.toObject(), aiEnabled: isAiConfigured() });
    } catch (error) {
        console.log("Error in createMockInterview:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function listMockInterviews(req, res) {
    try {
        const interviews = await MockInterview.find({ user: req.user._id }).select(LIST_FIELDS).sort({ createdAt: -1 }).limit(50).lean();
        res.status(200).json({ interviews });
    } catch (error) {
        console.log("Error in listMockInterviews:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getMockInterview(req, res) {
    try {
        const iv = await loadOwned(req, res);
        if (!iv) return;
        res.status(200).json({ interview: iv.toObject(), aiEnabled: isAiConfigured() });
    } catch (error) {
        console.log("Error in getMockInterview:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * Advances the interview by one turn (SSE). Body: { answer } except for the very first turn
 * or when retrying after a failed generation (last message is already the candidate's).
 */
export async function takeTurn(req, res) {
    try {
        const iv = await loadOwned(req, res);
        if (!iv) return;
        if (!isAiConfigured()) return notConfigured(res);
        if (iv.status === "completed") return res.status(400).json({ message: "This interview is already finished" });

        const last = iv.messages.at(-1);
        const answer = str(req.body?.answer, 8000);
        if (last?.role === "interviewer") {
            if (!answer) return res.status(400).json({ message: "answer is required" });
            iv.messages.push({ role: "candidate", content: answer });
            await iv.save();
        }

        const askedSoFar = iv.messages.filter((m) => m.role === "interviewer").length;
        const final = askedSoFar >= iv.totalQuestions;

        return streamToClient(req, res, {
            system: interviewerSystem(iv, { askedSoFar, final }),
            messages: toChatTurns(iv.messages),
            maxTokens: 600,
            onComplete: async (text) => {
                iv.messages.push({ role: "interviewer", content: text.trim().slice(0, 8000) });
                if (final) {
                    iv.status = "completed";
                    iv.completedAt = new Date();
                }
                await iv.save();
            },
        });
    } catch (error) {
        console.log("Error in takeTurn:", error.message);
        if (!res.headersSent) res.status(500).json({ message: "Internal Server Error" });
    }
}

// Lets the candidate stop early; the report will reflect the questions covered.
export async function finishMockInterview(req, res) {
    try {
        const iv = await loadOwned(req, res);
        if (!iv) return;
        if (iv.status !== "completed") {
            iv.status = "completed";
            iv.completedAt = new Date();
            await iv.save();
        }
        res.status(200).json({ interview: iv.toObject() });
    } catch (error) {
        console.log("Error in finishMockInterview:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Streams the candidate's own performance report and saves it with parsed scores.
export async function generateMockReport(req, res) {
    try {
        const iv = await loadOwned(req, res);
        if (!iv) return;
        if (!isAiConfigured()) return notConfigured(res);
        if (iv.status !== "completed") return res.status(400).json({ message: "Finish the interview first" });
        if (!iv.messages.some((m) => m.role === "candidate")) {
            return res.status(400).json({ message: "Answer at least one question to get a report" });
        }

        return streamToClient(req, res, {
            system: reportSystem(),
            prompt: reportPrompt(iv),
            maxTokens: 3000,
            onComplete: async (text) => {
                const { report, scores } = splitReport(text);
                iv.report = report;
                for (const [k, v] of Object.entries(scores)) iv.scores[k] = v;
                iv.reportGeneratedAt = new Date();
                await iv.save();
            },
        });
    } catch (error) {
        console.log("Error in generateMockReport:", error.message);
        if (!res.headersSent) res.status(500).json({ message: "Internal Server Error" });
    }
}
