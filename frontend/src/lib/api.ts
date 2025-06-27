import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { getCookie } from 'cookies-next';

export const logoutEvent = 'auth:logout';

// Define a custom interface for internal requests to add our custom `_retry` property.
export interface InternalAxiosRequestConfig extends AxiosRequestConfig {
    _retry?: boolean;
    _skipAuthRefresh?: boolean;
}

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
    withCredentials: true, // Crucial for sending HttpOnly cookies
});

// Request interceptor: Add CSRF token to all state-changing (unsafe) requests.
api.interceptors.request.use((config) => {
    // Ensure this logic only runs on the client-side
    if (typeof window !== 'undefined') {
        const unsafeMethods = ['post', 'put', 'patch', 'delete'];
        if (config.method && unsafeMethods.includes(config.method.toLowerCase())) {
            const csrfToken = getCookie('csrftoken');
            if (csrfToken) {
                config.headers['X-CSRFToken'] = csrfToken;
            }
        }
    }
    return config;
});

// State for handling token refresh race conditions.
let isRefreshing = false;
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: AxiosError | null) => void; }[] = [];

const processQueue = (error: AxiosError | null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(true);
        }
    });
    failedQueue = [];
};

// Response interceptor: Handle automatic token refresh on 401 Unauthorized errors.
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig;

        const shouldNotRetry = 
            error.response?.status !== 401 ||
            originalRequest._retry ||
            originalRequest._skipAuthRefresh ||
            originalRequest.url?.includes('/login') ||
            originalRequest.url?.includes('/register') ||
            originalRequest.url?.includes('/token/refresh');

        if (shouldNotRetry) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then(() => api(originalRequest));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            if (process.env.NODE_ENV !== 'production') {
                console.log('Session expired. Attempting to refresh token...');
            }
            await api.post('/token/refresh/');
            if (process.env.NODE_ENV !== 'production') {
                console.log('Token refreshed successfully. Retrying all requests.');
            }
            processQueue(null);
            return api(originalRequest);
        } catch (refreshError) {
            console.error('Token refresh failed. User session has ended. Please log in again.');
            const axiosError = refreshError instanceof AxiosError ? refreshError : null;
            processQueue(axiosError);
            window.dispatchEvent(new Event(logoutEvent));
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default api;
