import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
const apiOrigin = /^https?:\/\//i.test(configuredApiUrl)
  ? configuredApiUrl
  : `https://${configuredApiUrl}`;
const normalizedApiUrl = apiOrigin.replace(/\/+$/, "");
const apiBaseURL = normalizedApiUrl.endsWith("/api")
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;

const api = axios.create({
  baseURL: apiBaseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sentinel_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401) localStorage.removeItem("sentinel_token");
  return Promise.reject(error);
});

export default api;