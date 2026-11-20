import axiosInstance from "../lib/axios";

export const sessionApi = {
    createSession: async (data) => (await axiosInstance.post("/sessions", data)).data,
    getActiveSessions: async () => (await axiosInstance.get("/sessions/active")).data,
    getMyRecentSessions: async () => (await axiosInstance.get("/sessions/my-recent")).data,
    getHostedSessions: async () => (await axiosInstance.get("/sessions/hosted")).data,
    getSessionById: async (id) => (await axiosInstance.get(`/sessions/${id}`)).data,
    joinSession: async (id) => (await axiosInstance.post(`/sessions/${id}/join`)).data,
    endSession: async ({ id, finalCode, finalLanguage }) =>
        (await axiosInstance.post(`/sessions/${id}/end`, { finalCode, finalLanguage })).data,
    getStreamToken: async () => (await axiosInstance.get("/chat/token")).data,

    // interviewer-only
    getEvaluation: async (id) => (await axiosInstance.get(`/sessions/${id}/evaluation`)).data,
    updateEvaluation: async ({ id, ...data }) => (await axiosInstance.patch(`/sessions/${id}/evaluation`, data)).data,
    getRecordings: async (id) => (await axiosInstance.get(`/sessions/${id}/recordings`)).data,
};

export const mockApi = {
    list: async () => (await axiosInstance.get("/mock-interviews")).data,
    create: async (data) => (await axiosInstance.post("/mock-interviews", data)).data,
    get: async (id) => (await axiosInstance.get(`/mock-interviews/${id}`)).data,
    finish: async (id) => (await axiosInstance.post(`/mock-interviews/${id}/finish`)).data,
};
