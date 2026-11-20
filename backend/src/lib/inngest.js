import { Inngest } from "inngest";
import { connectDB } from "./db.js";
import User from "../models/User.js";
import { upsertStreamUser, deleteStreamUser } from "./stream.js";

export const inngest = new Inngest({ id: "CodingInterview_Platform" });

const toUserDoc = (data) => {
    const { id, email_addresses, first_name, last_name, image_url } = data;
    const name = `${first_name || ""} ${last_name || ""}`.trim();
    const email = email_addresses?.[0]?.email_address;
    return {
        clerkId: id,
        email,
        name: name || email?.split("@")[0] || "User",
        profileImage: image_url || "",
    };
};

// Upsert keeps this idempotent: Inngest retries and duplicate webhooks never create duplicates.
const syncUser = inngest.createFunction(
    { id: "sync-user" },
    { event: "clerk/user.created" },
    async ({ event }) => {
        await connectDB();
        const user = toUserDoc(event.data);
        await User.updateOne({ clerkId: user.clerkId }, { $set: user }, { upsert: true });
        await upsertStreamUser({ id: user.clerkId, name: user.name, image: user.profileImage });
    }
);

const updateUser = inngest.createFunction(
    { id: "update-user" },
    { event: "clerk/user.updated" },
    async ({ event }) => {
        await connectDB();
        const user = toUserDoc(event.data);
        await User.updateOne({ clerkId: user.clerkId }, { $set: user }, { upsert: true });
        await upsertStreamUser({ id: user.clerkId, name: user.name, image: user.profileImage });
    }
);

const deleteUserFromDB = inngest.createFunction(
    { id: "delete-user-from-db" },
    { event: "clerk/user.deleted" },
    async ({ event }) => {
        await connectDB();
        const { id } = event.data;
        await User.deleteOne({ clerkId: id });
        await deleteStreamUser(id.toString());
    }
);

export const functions = [syncUser, updateUser, deleteUserFromDB];
