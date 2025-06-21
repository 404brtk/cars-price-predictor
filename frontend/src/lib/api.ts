import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { getCookie } from 'cookies-next';

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
    const unsafeMethods = ['post', 'put', 'patch', 'delete'];
    if (config.method && unsafeMethods.includes(config.method.toLowerCase())) {
        const csrfToken = getCookie('csrftoken');
        if (csrfToken) {
            config.headers['X-CSRFToken'] = csrfToken;
        }
    }
    return config;
});

// Response interceptor: Handle automatic token refresh on 401 Unauthorized errors.
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig;

        // Conditions to NOT attempt a token refresh:
        const shouldNotRetry = 
            error.response?.status !== 401 || // Not a 401 error
            originalRequest._retry || // Already retried this request
            originalRequest._skipAuthRefresh || // Explicitly told not to refresh
            originalRequest.url?.includes('/login') || // A failed login attempt
            originalRequest.url?.includes('/register') || // A failed register attempt
            originalRequest.url?.includes('/token/refresh'); // The failed request was already for refresh

        if (shouldNotRetry) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            console.log('Session expired. Attempting to refresh token...');
            await api.post('/token/refresh/');
            console.log('Token refreshed successfully. Retrying original request.');
            return api(originalRequest);
        } catch (refreshError) {
            console.error('Token refresh failed. User session has ended. Please log in again.');
            // Dispatch a global event to notify the app of the final logout.
            window.dispatchEvent(new Event('logout'));
            return Promise.reject(refreshError);
        }
    }
);

export default api;
