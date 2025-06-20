import axios from 'axios';
import { getCookie } from 'cookies-next';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api',
    withCredentials: true, // Crucial for sending HttpOnly cookies
});

// Use a request interceptor to add the CSRF token to state-changing requests
api.interceptors.request.use((config) => {
    // Django's CSRF protection is only required for "unsafe" methods
    const unsafeMethods = ['post', 'put', 'patch', 'delete'];
    if (config.method && unsafeMethods.includes(config.method.toLowerCase())) {
        // getCookie is isomorphic and can run on server or client
        const csrfToken = getCookie('csrftoken'); 
        if (csrfToken) {
            config.headers['X-CSRFToken'] = csrfToken;
        }
    }
    return config;
});

/**
 * You can also add a response interceptor for global error handling.
 * For example, this could be used to automatically refresh the access token
 * or redirect to the login page on a 401 Unauthorized error.
 */
api.interceptors.response.use(
    (response) => response, // Directly return successful responses
    async (error) => {
        const originalRequest = error.config;

        // Example: Logic for automatic token refresh on 401 error
        // This is an advanced pattern you might consider later.
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                // Attempt to refresh the token
                await api.post('/token/refresh/');
                // If successful, the new access token is in the cookie, so retry the original request
                return api(originalRequest);
            } catch (refreshError) {
                // If refresh fails, redirect to login or handle the error
                console.error('Token refresh failed:', refreshError);
                // if (typeof window !== 'undefined') {
                //     window.location.href = '/login';
                // }
            }
        }

        return Promise.reject(error);
    }
);

export default api;
