import { requestAdminJson } from "./adminApi";

const BASE = "/tables";

export const listenToTables = listenTables;

export function listenTables(callback: (tables: any[]) => void, onError: (err: Error) => void = () => { }) {
  let active = true;

  const load = async () => {
    try {
      const data = await requestAdminJson(`${BASE}`);
      if (active) {
        callback(data);
      }
    } catch (err: any) {
      console.error("Error loading admin tables:", err);
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  load();
  const interval = setInterval(load, 20000);

  return () => {
    active = false;
    clearInterval(interval);
  };
}

export async function createTable(area: string, tableNumber: number, areaLabel?: string) {
  return await requestAdminJson(`${BASE}`, {
    method: "POST",
    body: JSON.stringify({ area, tableNumber, areaLabel }),
  });
}

export async function freeTable(tableId: string) {
  return await requestAdminJson(`${BASE}/${tableId}`, {
    method: "PUT",
    body: JSON.stringify({ occupied: false, status: "available", currentOrderId: "", currentSessionId: "" }),
  });
}

export async function updateTableStatus(tableId: string, status: string) {
  return await requestAdminJson(`${BASE}/${tableId}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export async function deleteTable(tableId: string) {
  return await requestAdminJson(`${BASE}/${tableId}`, {
    method: "DELETE",
  });
}
