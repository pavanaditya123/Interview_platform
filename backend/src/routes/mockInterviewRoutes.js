import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { protectRoute } from "../middleware/protectRoute.js";
import {
    createMockInterview,
    finishMockInterview,
    generateMockReport,
    getMockInterview,
    listMockInterviews,
    takeTurn,
} from "../controllers/mockInterviewController.js";

const router = express.Router();

const limiter = (limit, message) =>
    rateLimit({
        windowMs: 60 * 60 * 1000,
        limit,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        keyGenerator: (req) => req.user?.clerkId ?? ipKeyGenerator(req.ip),
        message: { message },
    });

router.get("/", protectRoute, listMockInterviews);
router.post("/", protectRoute, limiter(10, "You can start up to 10 mock interviews per hour."), createMockInterview);
router.get("/:id", protectRoute, getMockInterview);
router.post("/:id/turn", protectRoute, limiter(120, "Too many messages this hour. Take a short break."), takeTurn);
router.post("/:id/finish", protectRoute, finishMockInterview);
router.post("/:id/report", protectRoute, limiter(20, "Too many reports this hour."), generateMockReport);

export default router;
