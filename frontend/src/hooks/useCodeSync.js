import { useCallback, useEffect, useRef } from "react";

const MAX_EVENT_BYTES = 4500; // Stream custom events are capped at 5KB
const DEBOUNCE_MS = 250;

/**
 * Real-time code sync between interviewer and candidate using Stream call custom events.
 * Returns `broadcast(code, language)` to call whenever the local user edits.
 */
export function useCodeSync(call, { onRemoteUpdate, getCurrent }) {
    const timer = useRef(null);
    const lastRemote = useRef(null);
    const warned = useRef(false);
    const handlersRef = useRef({ onRemoteUpdate, getCurrent });

    useEffect(() => {
        handlersRef.current = { onRemoteUpdate, getCurrent };
    }, [onRemoteUpdate, getCurrent]);

    const send = useCallback(
        (payload) => {
            if (!call) return;
            const size = new Blob([JSON.stringify(payload)]).size;
            if (size > MAX_EVENT_BYTES) {
                if (!warned.current) {
                    console.warn("Code too large to live-sync; peers will not see further changes.");
                    warned.current = true;
                }
                return;
            }
            call.sendCustomEvent(payload).catch((e) => console.error("code sync failed", e));
        },
        [call]
    );

    useEffect(() => {
        if (!call) return;
        const unsubscribe = call.on("custom", (event) => {
            const myId = call.state.localParticipant?.userId ?? call.currentUserId;
            if (event.user?.id && event.user.id === myId) return;
            const data = event.custom || {};
            if (data.type === "code-update") {
                lastRemote.current = data.code;
                handlersRef.current.onRemoteUpdate?.(data);
            } else if (data.type === "code-sync-request") {
                const current = handlersRef.current.getCurrent?.();
                if (current) send({ type: "code-update", ...current });
            }
        });

        // Ask whoever is already in the room for the latest code.
        send({ type: "code-sync-request" });

        return () => {
            unsubscribe?.();
            clearTimeout(timer.current);
        };
    }, [call, send]);

    const broadcast = useCallback(
        (code, language) => {
            if (code === lastRemote.current) return; // don't echo back what we just received
            clearTimeout(timer.current);
            timer.current = setTimeout(() => send({ type: "code-update", code, language }), DEBOUNCE_MS);
        },
        [send]
    );

    return broadcast;
}
