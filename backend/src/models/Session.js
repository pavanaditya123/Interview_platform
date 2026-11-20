import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
    {
        problem: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            required: true,
        },
        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        participant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        status: {
            type: String,
            enum: ["active", "completed"],
            default: "active",
        },
        callId: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

// Indexes for the hot queries: active list, a user's past sessions.
sessionSchema.index({ status: 1, createdAt: -1 });
sessionSchema.index({ host: 1, status: 1, createdAt: -1 });
sessionSchema.index({ participant: 1, status: 1, createdAt: -1 });

const Session = mongoose.model("Session", sessionSchema);

export default Session;
