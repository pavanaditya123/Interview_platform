import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { sessionApi } from "../api/sessions";
import { getErrorMessage } from "../lib/axios";

export const sessionKeys = {
    active: ["sessions", "active"],
    recent: ["sessions", "recent"],
    detail: (id) => ["sessions", id],
};

export const useActiveSessions = () =>
    useQuery({
        queryKey: sessionKeys.active,
        queryFn: sessionApi.getActiveSessions,
        refetchInterval: 15000, // keep the lobby fresh without hammering the API
    });

export const useMyRecentSessions = () =>
    useQuery({
        queryKey: sessionKeys.recent,
        queryFn: sessionApi.getMyRecentSessions,
    });

export const useSessionById = (id) =>
    useQuery({
        queryKey: sessionKeys.detail(id),
        queryFn: () => sessionApi.getSessionById(id),
        enabled: Boolean(id),
        refetchInterval: 5000, // notice when the participant joins or the host ends the session
    });

export const useCreateSession = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: sessionApi.createSession,
        onSuccess: () => {
            toast.success("Session created!");
            qc.invalidateQueries({ queryKey: sessionKeys.active });
        },
        onError: (error) => toast.error(getErrorMessage(error, "Failed to create session")),
    });
};

export const useJoinSession = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: sessionApi.joinSession,
        onSuccess: (data) => {
            toast.success("Joined session!");
            qc.setQueryData(sessionKeys.detail(data.session._id), (old) => old ?? data);
            qc.invalidateQueries({ queryKey: ["sessions"] });
        },
        onError: (error) => toast.error(getErrorMessage(error, "Failed to join session")),
    });
};

export const useEndSession = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: sessionApi.endSession,
        onSuccess: () => {
            toast.success("Session ended");
            qc.invalidateQueries({ queryKey: ["sessions"] });
        },
        onError: (error) => toast.error(getErrorMessage(error, "Failed to end session")),
    });
};
