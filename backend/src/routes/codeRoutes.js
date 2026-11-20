import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { protectRoute } from "../middleware/protectRoute.js";
import { executeCode } from "../controllers/codeController.js";

const router = express.Router();

const executeLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.clerkId ?? ipKeyGenerator(req.ip),
    message: { success: false, error: "Too many runs, please wait a moment." },
});

router.post("/execute", protectRoute, executeLimiter, executeCode);

export default router;
