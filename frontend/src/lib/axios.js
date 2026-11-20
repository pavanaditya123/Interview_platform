import axios from "axios";

// In production the API is served from the same origin as the app, so a relative "/api" works.
const baseURL = import.meta.env.VITE_API_URL || "/api";

const axiosInstance = axios.create({
    baseURL,
    withCredentials: true,
    timeout: 15000,
});

// Attach the Clerk session token so auth works cross-origin in development too.
axiosInstance.interceptors.request.use(async (config) => {
    try {
        const token = await window.Clerk?.session?.getToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {
        // not signed in yet - request goes out unauthenticated
    }
    return config;
});

export const getErrorMessage = (error, fallback = "Something went wrong") =>
    error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;

export default axiosInstance;
