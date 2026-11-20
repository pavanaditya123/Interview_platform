import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { addProgress, getProgress } from "../controllers/userController.js";

const router = express.Router();

router.get("/me/progress", protectRoute, getProgress);
router.post("/me/progress", protectRoute, addProgress);

export default router;
