const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://rustic-c-bck.onrender.com").replace(/\/$/, "");
const API_BASE = `${API_BASE_URL}/api/staff`;

async function fetchStaffJson(path: string, options: RequestInit = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (contentType.includes("text/html") || text.trim().startsWith("<!doctype html") || text.trim().startsWith("<html")) {
    throw new Error(`Staff API returned HTML instead of JSON at ${response.url || `${API_BASE}${path}`}. Check the backend URL.`);
  }

  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const errorMessage = data?.error || data?.message || response.statusText || "Request failed";
    throw new Error(errorMessage);
  }

  return data;
}

export async function requestStaffJson(path: string, options: RequestInit = {}) {
  const data = await fetchStaffJson(path, options);

  if (data && typeof data === "object" && data.ok === true) {
    return data.data;
  }

  return data;
}
