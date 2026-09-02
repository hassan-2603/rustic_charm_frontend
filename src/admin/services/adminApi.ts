import { auth } from "../../firebase";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
const API_BASE = `${API_BASE_URL}/api/admin`;
const LOCAL_BACKEND_ADMIN_TOKEN = "rustic-charm-admin-token";

async function getAdminToken() {
  const storedToken = localStorage.getItem("adminToken");
  if (storedToken && storedToken !== "undefined" && storedToken !== "null") {
    return storedToken;
  }

  if (auth.currentUser) {
    try {
      const freshToken = await auth.currentUser.getIdToken(true);
      if (freshToken) {
        localStorage.setItem("adminToken", freshToken);
        return freshToken;
      }
    } catch (err) {
      console.warn("Failed to refresh admin token from Firebase:", err);
    }
  }

  // Local dev fallback ONLY on localhost/127.0.0.1 — never used in production
  const hostname = typeof window !== "undefined" && window.location ? window.location.hostname : null;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
  if (isLocalHost) {
    console.debug("adminApi: using local fallback admin token for dev host", hostname);
    localStorage.setItem("adminToken", LOCAL_BACKEND_ADMIN_TOKEN);
    return LOCAL_BACKEND_ADMIN_TOKEN;
  }

  throw new Error("Not authenticated: no Firebase admin session found. Please log in again.");
}

async function parseErrorResponse(response: Response) {
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return data?.error || data?.message || response.statusText || "Request failed";
  } catch {
    return text || response.statusText || "Request failed";
  }
}

async function executeAdminRequest(path: string, options: RequestInit = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const token = await getAdminToken();
  if (token) {
    Object.assign(headers, {
      Authorization: `Bearer ${token}`,
      "x-admin-token": token,
    });
  }

  // append adminToken as query param as a fallback when proxies strip headers
  let url = `${API_BASE}${path}`;
  try {
    const hasQuery = url.includes("?");
    if (token) {
      url = `${url}${hasQuery ? "&" : "?"}adminToken=${encodeURIComponent(token)}`;
    }
  } catch (e) {
    // ignore
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

async function fetchAdminJson(path: string, options: RequestInit = {}) {
  let response = await executeAdminRequest(path, options);

  if (response.status === 401) {
    if (auth.currentUser) {
      try {
        const refreshedToken = await auth.currentUser.getIdToken(true);
        localStorage.setItem("adminToken", refreshedToken);
        const headers = {
          "Content-Type": "application/json",
          ...options.headers,
          Authorization: `Bearer ${refreshedToken}`,
        };
        response = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers,
        });
      } catch (err) {
        console.warn("Failed to refresh admin token after 401:", err);
      }
    }
  }

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (contentType.includes("text/html") || text.trim().startsWith("<!doctype html") || text.trim().startsWith("<html")) {
    throw new Error(`Admin API returned HTML instead of JSON at ${response.url || `${API_BASE}${path}`}. Check the backend URL or Netlify redirect rules.`);
  }

  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const errorMessage = data?.error || data?.message || response.statusText || "Request failed";
    throw new Error(errorMessage);
  }

  return data;
}

export async function requestAdminJson(path: string, options: RequestInit = {}) {
  const data = await fetchAdminJson(path, options);

  if (data && typeof data === "object" && data.ok === true) {
    return data.data;
  }

  return data;
}

export function setAdminToken(token: string) {
  localStorage.setItem("adminToken", token);
}

export function clearAdminToken() {
  localStorage.removeItem("adminToken");
}

export function getStoredAdminToken() {
  return getAdminToken();
}
