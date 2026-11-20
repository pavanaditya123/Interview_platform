import { getAuth } from "@clerk/express";
import User from "../models/User.js";

// Small in-process cache so every authenticated request doesn't hit MongoDB for the user lookup.
const USER_CACHE_TTL_MS = 60 * 1000;
const userCache = new Map();

export const clearUserCache = () => userCache.clear();

export const loadUser = async (req, res, next) => {
    try {
        const clerkId = getAuth(req)?.userId;
        if (!clerkId) {
            return res.status(401).json({ message: "Unauthorized - invalid token" });
        }

        const cached = userCache.get(clerkId);
        if (cached && cached.expires > Date.now()) {
            req.user = cached.user;
            return next();
        }

        const user = await User.findOne({ clerkId }).lean();
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        userCache.set(clerkId, { user, expires: Date.now() + USER_CACHE_TTL_MS });
        if (userCache.size > 5000) userCache.delete(userCache.keys().next().value);

        req.user = user;
        next();
    } catch (error) {
        console.error("Error in protectRoute middleware", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// loadUser already answers 401 JSON when there is no Clerk session. Clerk's requireAuth()
// would instead 302-redirect to a sign-in page, which API clients can't follow.
export const protectRoute = [loadUser];
