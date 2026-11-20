import User from "../models/User.js";

const ID_RE = /^[a-z0-9-]{1,100}$/;
const cleanIds = (ids) => (Array.isArray(ids) ? ids.filter((id) => typeof id === "string" && ID_RE.test(id)).slice(0, 500) : []);

export async function getProgress(req, res) {
    try {
        const user = await User.findById(req.user._id).select("solvedProblems").lean();
        res.status(200).json({ solvedProblems: user?.solvedProblems ?? [] });
    } catch (error) {
        console.log("Error in getProgress:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Adds solved problem ids (idempotent). Accepts { problemIds: [...] } so a browser can merge its local progress.
export async function addProgress(req, res) {
    try {
        const ids = cleanIds(req.body?.problemIds);
        if (!ids.length) return res.status(400).json({ message: "problemIds must be a non-empty array of ids" });
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $addToSet: { solvedProblems: { $each: ids } } },
            { new: true, projection: { solvedProblems: 1 } }
        ).lean();
        res.status(200).json({ solvedProblems: user?.solvedProblems ?? [] });
    } catch (error) {
        console.log("Error in addProgress:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
