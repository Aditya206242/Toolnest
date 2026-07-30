import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true, // Send cookies (HTTP-Only Refresh Token) with all requests
});

let accessToken = '';
let refreshSubscribers = [];
let isRefreshing = false;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

const onRefreshed = (token) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback) => {
  refreshSubscribers.push(callback);
};

// Request Interceptor: Inject JWT Access Token
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle automatic token refreshing on 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const originalRequest = config;

    // Check if request failed due to expired access token (401)
    if (
      response &&
      response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/signup')
    ) {
      // If refresh token request itself fails with 401, force logout
      if (originalRequest.url.includes('/auth/refresh')) {
        setAccessToken('');
        window.dispatchEvent(new Event('auth-logout'));
        return Promise.reject(error);
      }

      // If token refresh is already in progress, queue subsequent requests
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/auth/refresh`;
        const res = await axios.post(refreshUrl, {}, { withCredentials: true });
        
        const newAccessToken = res.data.accessToken;
        setAccessToken(newAccessToken);
        
        isRefreshing = false;
        onRefreshed(newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        isRefreshing = false;
        setAccessToken('');
        window.dispatchEvent(new Event('auth-logout'));
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
