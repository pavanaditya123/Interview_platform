import { useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";
import { sessionApi } from "../api/sessions";
import { initializeStreamClient, disconnectStreamClient, STREAM_API_KEY } from "../lib/stream";

// Joins/leaves run one after another so React StrictMode's mount→unmount→mount
// never races a `join` against a `leave` on the same call.
let queue = Promise.resolve();
const enqueue = (task) => {
    queue = queue.then(task, task).catch((e) => console.error(e));
    return queue;
};

function useStreamClient(session, loadingSession, isHost, isParticipant) {
    const [streamClient, setStreamClient] = useState(null);
    const [call, setCall] = useState(null);
    const [chatClient, setChatClient] = useState(null);
    const [channel, setChannel] = useState(null);
    const [isInitializingCall, setIsInitializingCall] = useState(true);

    const callId = session?.callId;
    const isActive = session?.status === "active";
    const canJoin = Boolean(callId) && isActive && (isHost || isParticipant);

    useEffect(() => {
        if (loadingSession) return;
        if (!canJoin) {
            setIsInitializingCall(false);
            return;
        }

        let cancelled = false;
        let videoCall = null;
        let chat = null;

        setIsInitializingCall(true);
        enqueue(async () => {
            if (cancelled) return;
            try {
                const { token, userId, userName, userImage } = await sessionApi.getStreamToken();
                const user = { id: userId, name: userName, image: userImage };

                const client = await initializeStreamClient(user, token);
                videoCall = client.call("default", callId);
                await videoCall.join({ create: true });

                chat = StreamChat.getInstance(STREAM_API_KEY);
                if (chat.userID !== userId) {
                    if (chat.userID) await chat.disconnectUser();
                    await chat.connectUser(user, token);
                }
                const chatChannel = chat.channel("messaging", callId);
                await chatChannel.watch();

                if (cancelled) return;
                setStreamClient(client);
                setCall(videoCall);
                setChatClient(chat);
                setChannel(chatChannel);
            } catch (error) {
                console.error("Error initializing Stream:", error);
                if (!cancelled) toast.error("Failed to join the video call");
            } finally {
                if (!cancelled) setIsInitializingCall(false);
            }
        });

        return () => {
            cancelled = true;
            setCall(null);
            setChannel(null);
            enqueue(async () => {
                try {
                    if (videoCall) await videoCall.leave();
                } catch {
                    // already left
                }
                try {
                    if (chat?.userID) await chat.disconnectUser();
                } catch {
                    // ignore
                }
                await disconnectStreamClient();
            });
        };
    }, [callId, canJoin, loadingSession]);

    return { streamClient, call, chatClient, channel, isInitializingCall };
}

export default useStreamClient;
