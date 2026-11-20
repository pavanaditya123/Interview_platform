import mongoose from "mongoose";

// Interviewer-only data for a session. Kept in its own collection so no public
// session endpoint can ever leak it to the candidate.
export const SCORE_KEYS = ["problemSolving", "codeQuality", "communication", "technicalKnowledge", "testing"];
export const RECOMMENDATIONS = ["", "strong_hire", "hire", "lean_hire", "no_hire", "strong_no_hire"];

const scoreField = { type: Number, min: 0, max: 5, default: 0 }; // 0 = not scored

const evaluationSchema = new mongoose.Schema(
    {
        session: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true, unique: true },
        host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        requirements: {
            role: { type: String, default: "", maxlength: 120 },
            level: { type: String, default: "", maxlength: 60 },
            skills: { type: String, default: "", maxlength: 2000 },
        },
        notes: { type: String, default: "", maxlength: 20000 },
        scores: Object.fromEntries(SCORE_KEYS.map((k) => [k, scoreField])),
        recommendation: { type: String, enum: RECOMMENDATIONS, default: "" },
        finalCode: { type: String, default: "", maxlength: 20000 },
        finalLanguage: { type: String, default: "" },
        report: { type: String, default: "" },
        reportGeneratedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

const Evaluation = mongoose.model("Evaluation", evaluationSchema);
export default Evaluation;
