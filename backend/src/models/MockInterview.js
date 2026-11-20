import mongoose from "mongoose";

export const MOCK_FOCUS = ["technical", "behavioral", "mixed"];
export const MOCK_SCORE_KEYS = ["overall", "communication", "technicalDepth", "problemSolving", "relevance", "confidence"];

const messageSchema = new mongoose.Schema(
    {
        role: { type: String, enum: ["interviewer", "candidate"], required: true },
        content: { type: String, required: true, maxlength: 8000 },
    },
    { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

// An AI-run practice interview. Only its owner can read it, including the report.
const mockInterviewSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        role: { type: String, required: true, maxlength: 120 },
        level: { type: String, default: "", maxlength: 60 },
        focus: { type: String, enum: MOCK_FOCUS, default: "mixed" },
        jobDescription: { type: String, default: "", maxlength: 6000 },
        resumeText: { type: String, default: "", maxlength: 15000 },
        totalQuestions: { type: Number, min: 3, max: 10, default: 5 },
        status: { type: String, enum: ["in_progress", "completed"], default: "in_progress" },
        messages: { type: [messageSchema], default: [] },
        report: { type: String, default: "" },
        scores: Object.fromEntries(MOCK_SCORE_KEYS.map((k) => [k, { type: Number, min: 0, max: 10, default: 0 }])),
        reportGeneratedAt: { type: Date, default: null },
        completedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

mockInterviewSchema.index({ user: 1, createdAt: -1 });

const MockInterview = mongoose.model("MockInterview", mockInterviewSchema);
export default MockInterview;
