import axios from "axios";

const ADMIN_TOKEN_KEY = "admin_token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:4000/api",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    else delete config.headers.Authorization;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const reqUrl = String(err.config?.url || "");
    if (status === 401 && reqUrl.includes("/admin/") && !reqUrl.includes("/admin/login")) {
      setToken(null);
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
        window.location.assign(`${window.location.origin}/admin/login`);
      }
    }
    return Promise.reject(err);
  }
);

/** 관리자 JWT 저장/삭제. Authorization 헤더는 요청 인터셉터가 매번 localStorage 기준으로 붙입니다. */
export function setToken(token) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}
