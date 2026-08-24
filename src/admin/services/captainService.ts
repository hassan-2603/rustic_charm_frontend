// The "Captain Name" field on the admin Dashboard is a simple label the
// admin sets for their own reference (e.g. which captain/manager is on
// shift) — it isn't printer configuration and isn't shared with waiters
// or the backend, so it's just stored locally on this browser/device.

const STORAGE_KEY = "rustic-charm-captain-name";

export function getCaptainName(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) || "";
}

export function saveCaptainName(name: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, name || "");
}
