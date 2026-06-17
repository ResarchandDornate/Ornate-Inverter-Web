import axios from "axios";
import { getToken } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://lab.ornatesolar.com/api/";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

const PUBLIC_AUTH_PATHS = [
  "auth/signin",
  "auth/signup",
  "auth/register",
  "auth/login",
  "auth/token/refresh",
  "auth/password/reset",
];

const isPublicAuthRequest = (url = "") => {
  const normalized = url.replace(/^\/+/, "").toLowerCase();
  return PUBLIC_AUTH_PATHS.some((p) => normalized.startsWith(p));
};

axiosInstance.interceptors.request.use((config) => {
  if (isPublicAuthRequest(config.url)) {
    if (config.headers) delete config.headers.Authorization;
    return config;
  }
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Some backend endpoints return HTTP 200 with `{ success: false, message: "..." }`
// in the body for logical failures. Treat that as an error.
const enforceSuccessFlag = (data) => {
  if (data && typeof data === "object" && data.success === false) {
    const msg = data.message || data.detail || "Request failed";
    throw new Error(msg);
  }
  return data;
};

const buildErrorFromResponse = (error) => {
  if (error.response) {
    const data = error.response.data;
    if (typeof data === "string") return new Error(data);
    if (data?.message) return new Error(data.message);
    if (data?.detail) return new Error(data.detail);
    if (typeof data === "object" && data !== null) {
      const messages = Object.keys(data)
        .map((key) => {
          const val = data[key];
          return `${key}: ${Array.isArray(val) ? val.join(", ") : val}`;
        })
        .join("\n");
      return new Error(messages || "Server Error");
    }
    return new Error("Server Error");
  }
  if (error.request) return new Error("Network Error - No response from server");
  return new Error(error.message || "Unknown error");
};

const normalize = (endpoint) => (endpoint.startsWith("/") ? endpoint.substring(1) : endpoint);

export const getData = async (endpoint) => {
  try {
    const response = await axiosInstance.get(normalize(endpoint));
    return enforceSuccessFlag(response.data);
  } catch (error) {
    throw buildErrorFromResponse(error);
  }
};

export const postData = async (endpoint, data) => {
  try {
    const response = await axiosInstance.post(normalize(endpoint), data);
    return enforceSuccessFlag(response.data);
  } catch (error) {
    throw buildErrorFromResponse(error);
  }
};

export const putData = async (endpoint, data) => {
  try {
    const response = await axiosInstance.put(normalize(endpoint), data);
    return enforceSuccessFlag(response.data);
  } catch (error) {
    throw buildErrorFromResponse(error);
  }
};

export const deleteData = async (endpoint) => {
  try {
    const response = await axiosInstance.delete(normalize(endpoint));
    return enforceSuccessFlag(response.data);
  } catch (error) {
    throw buildErrorFromResponse(error);
  }
};

export default axiosInstance;
