import axios from 'axios';

const AUTH_URL = process.env.REACT_APP_AUTH_SERVICE_URL || 'http://localhost:4001';
const PRODUCT_URL = process.env.REACT_APP_PRODUCT_SERVICE_URL || 'http://localhost:4002';
const ORDER_URL = process.env.REACT_APP_ORDER_SERVICE_URL || 'http://localhost:4003';
const CART_URL = process.env.REACT_APP_CART_SERVICE_URL || 'http://localhost:4004';
const PROFILE_URL = process.env.REACT_APP_PROFILE_SERVICE_URL || 'http://localhost:4005';

const createInstance = (baseURL) => {
  const instance = axios.create({ baseURL, timeout: 10000 });

  // Attach token to every request
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // Auto-refresh token on 401
  instance.interceptors.response.use(
    (res) => res,
    async (err) => {
      const original = err.config;
      if (err.response?.status === 401 && !original._retry) {
        original._retry = true;
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) throw new Error('No refresh token');
          const { data } = await axios.post(`${AUTH_URL}/api/auth/refresh`, { refreshToken });
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

export const authApi = createInstance(AUTH_URL);
export const productApi = createInstance(PRODUCT_URL);
export const orderApi = createInstance(ORDER_URL);
export const cartApi = createInstance(CART_URL);
export const profileApi = createInstance(PROFILE_URL);
