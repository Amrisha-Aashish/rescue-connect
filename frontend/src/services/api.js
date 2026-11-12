import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// Attach JWT automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("rc_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("rc_token");
      localStorage.removeItem("rc_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
