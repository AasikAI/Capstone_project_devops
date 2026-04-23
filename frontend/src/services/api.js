import axios from 'axios';

// When running via Docker (nginx reverse proxy), all API calls go through
// the same origin — nginx routes /api/auth/* → auth-service:4001, etc.
// REACT_APP_*_URL defaults to '' (empty) so axios uses relative paths,
// which are forwarded by nginx. For local dev without Docker, override
// these vars to point directly at each service port.
const AUTH_BASE    = process.env.REACT_APP_AUTH_SERVICE_URL    || '';
const PRODUCT_BASE = process.env.REACT_APP_PRODUCT_SERVICE_URL || '';
const ORDER_BASE   = process.env.REACT_APP_ORDER_SERVICE_URL   || '';
const CART_BASE    = process.env.REACT_APP_CART_SERVICE_URL    || '';
const PROFILE_BASE = process.env.REACT_APP_PROFILE_SERVICE_URL || '';

const createInstance = (baseURL) => {
  const instance = axios.create({ baseURL, timeout: 15000, withCredentials: false });

  // Attach JWT to every request
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // Auto-refresh on 401
  instance.interceptors.response.use(
    (res) => res,
    async (err) => {
      const original = err.config;
      if (err.response?.status === 401 && !original._retry) {
        original._retry = true;
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) throw new Error('No refresh token');
          const { data } = await axios.post(
            `${AUTH_BASE}/api/auth/refresh`,
            { refreshToken }
          );
          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return instance(original);
        } catch (refreshErr) {
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        }
      }
      return Promise.reject(err);
    }
  );

  return instance;
};

export const authApi    = createInstance(AUTH_BASE);
export const productApi = createInstance(PRODUCT_BASE);
export const orderApi   = createInstance(ORDER_BASE);
export const cartApi    = createInstance(CART_BASE);
export const profileApi = createInstance(PROFILE_BASE);
