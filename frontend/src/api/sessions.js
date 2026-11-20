import axiosInstance from "../lib/axios";

export const sessionApi = {
    createSession: async (data) => (await axiosInstance.post("/sessions", data)).data,
    getActiveSessions: async () => (await axiosInstance.get("/sessions/active")).data,
    getMyRecentSessions: async () => (await axiosInstance.get("/sessions/my-recent")).data,
    getSessionById: async (id) => (await axiosInstance.get(`/sessions/${id}`)).data,
    joinSession: async (id) => (await axiosInstance.post(`/sessions/${id}/join`)).data,
    endSession: async (id) => (await axiosInstance.post(`/sessions/${id}/end`)).data,
    getStreamToken: async () => (await axiosInstance.get("/chat/token")).data,
};
