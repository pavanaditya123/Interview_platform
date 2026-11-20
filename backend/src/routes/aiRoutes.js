import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { protectRoute } from "../middleware/protectRoute.js";
import { getHint, getReview } from "../controllers/aiController.js";

const router = express.Router();

// Free-tier AI quotas are small: cap each user at 30 AI requests per hour.
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.clerkId ?? ipKeyGenerator(req.ip),
    message: { message: "You've used your AI requests for this hour. Try again later." },
});

router.post("/hint", protectRoute, aiLimiter, getHint);
router.post("/review", protectRoute, aiLimiter, getReview);

export default router;
