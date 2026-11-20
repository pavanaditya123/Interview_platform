import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { protectRoute } from "../middleware/protectRoute.js";
import {
    createSession,
    getActiveSessions,
    getPastSessions,
    getSessionById,
    joinSession,
    endSession,
} from "../controllers/sessionController.js";
import {
    generateReport,
    getEvaluation,
    getHostedSessions,
    getRecordings,
    updateEvaluation,
} from "../controllers/evaluationController.js";

const router = express.Router();

const reportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.clerkId ?? ipKeyGenerator(req.ip),
    message: { message: "Too many reports generated this hour. Try again later." },
});

router.post("/", protectRoute, createSession);
router.get("/active", protectRoute, getActiveSessions);
router.get("/my-recent", protectRoute, getPastSessions);
router.get("/pastSessions", protectRoute, getPastSessions); // kept for backwards compatibility
router.get("/hosted", protectRoute, getHostedSessions);
router.get("/:id", protectRoute, getSessionById);

router.post("/:id/join", protectRoute, joinSession);
router.post("/:id/end", protectRoute, endSession);

// Interviewer-only (host) endpoints
router.get("/:id/evaluation", protectRoute, getEvaluation);
router.patch("/:id/evaluation", protectRoute, updateEvaluation);
router.post("/:id/report", protectRoute, reportLimiter, generateReport);
router.get("/:id/recordings", protectRoute, getRecordings);

export default router;
