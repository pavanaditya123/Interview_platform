import { StreamVideoClient } from "@stream-io/video-react-sdk";

const apiKey = import.meta.env.VITE_STREAM_API_KEY;

let client = null;
let clientUserId = null;

// One video client per browser tab, reused across sessions.
export const initializeStreamClient = async (user, token) => {
    if (client && clientUserId === user.id) return client;
    if (client) await disconnectStreamClient();
    if (!apiKey) throw new Error("VITE_STREAM_API_KEY is not set");

    client = new StreamVideoClient({ apiKey, user, token });
    clientUserId = user.id;
    return client;
};

export const disconnectStreamClient = async () => {
    if (!client) return;
    try {
        await client.disconnectUser();
    } catch (error) {
        console.error("Error disconnecting Stream video client:", error);
    }
    client = null;
    clientUserId = null;
};

export const STREAM_API_KEY = apiKey;
