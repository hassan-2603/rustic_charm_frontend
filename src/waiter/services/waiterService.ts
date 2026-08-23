import { requestStaffJson as requestAdminJson } from "../../services/staffApi";

export async function loginWaiter(identifier: string, pin: string) {
  const trimmedIdentifier = identifier.trim();
  if (!trimmedIdentifier) {
    throw new Error("Please enter your Waiter Name or ID");
  }

  const waiters = await requestAdminJson("/waiters");
  const matchedDoc = Array.isArray(waiters)
    ? waiters.find((waiter: any) => {
        const idMatches = String(waiter.id || "").trim().toLowerCase() === trimmedIdentifier.toLowerCase();
        const nameMatches = String(waiter.name || "").trim().toLowerCase() === trimmedIdentifier.toLowerCase();
        return idMatches || nameMatches;
      })
    : null;

  if (!matchedDoc) {
    throw new Error("Waiter not found");
  }

  if (matchedDoc.active === false) {
    throw new Error("Waiter account disabled");
  }

  if (String(matchedDoc.pin) !== String(pin).trim()) {
    throw new Error("Invalid PIN");
  }

  return matchedDoc;
}

export function listenOrders(callback: (orders: any[]) => void) {
  let active = true;

  const load = async () => {
    try {
      const orders = await requestAdminJson("/orders");
      if (active) callback(Array.isArray(orders) ? orders : []);
    } catch (error) {
      console.error("Failed to load waiter orders:", error);
    }
  };

  load();
  const interval = setInterval(load, 5000);

  return () => {
    active = false;
    clearInterval(interval);
  };
}

export function listenTables(callback: (tables: any[]) => void) {
  let active = true;

  const load = async () => {
    try {
      const tables = await requestAdminJson("/tables");
      if (active) callback(Array.isArray(tables) ? tables : []);
    } catch (error) {
      console.error("Failed to load tables:", error);
    }
  };

  load();
  const interval = setInterval(load, 5000);

  return () => {
    active = false;
    clearInterval(interval);
  };
}

export async function createCaptainOrder(order: {
  tableId: string;
  waiterId: string;
  items: Array<{ menuItemId: string; name: string; quantity: number; price: number }>;
  total: number;
}) {
  return requestAdminJson("/orders", {
    method: "POST",
    body: JSON.stringify(order),
  });
}

export async function acceptOrder(orderId: string, waiter: any) {
  return requestAdminJson(`/orders/${orderId}`, {
    method: "PUT",
    body: JSON.stringify({
      status: "Accepted",
      waiterId: waiter.id,
      waiterName: waiter.name,
      acceptedAt: new Date().toISOString(),
    }),
  });
}

export async function serveOrder(orderId: string) {
  return requestAdminJson(`/orders/${orderId}`, {
    method: "PUT",
    body: JSON.stringify({ status: "Served", servedAt: new Date().toISOString() }),
  });
}

export async function endSession(order: any) {
  const updates: Promise<any>[] = [];

  // Mark order as Completed
  updates.push(
    requestAdminJson(`/orders/${order.id}`, {
      method: "PUT",
      body: JSON.stringify({ status: "Completed", completedAt: new Date().toISOString() }),
    })
  );

  // Free the table — use tableId if available, fall back to searching by tableReference
  if (order.tableId) {
    updates.push(
      requestAdminJson(`/tables/${order.tableId}`, {
        method: "PUT",
        body: JSON.stringify({ occupied: false, status: "available", currentOrderId: "", currentSessionId: "" }),
      })
    );
  } else if (order.tableReference) {
    // Fallback: find the table by reference from the tables list and free it
    try {
      const tables: any[] = await requestAdminJson("/tables");
      const table = Array.isArray(tables)
        ? tables.find((t: any) => t.tableKey === order.tableReference || t.id === order.tableReference)
        : null;
      if (table) {
        updates.push(
          requestAdminJson(`/tables/${table.id}`, {
            method: "PUT",
            body: JSON.stringify({ occupied: false, status: "available", currentOrderId: "", currentSessionId: "" }),
          })
        );
      }
    } catch {
      // best-effort: don't fail the whole endSession just because table lookup failed
    }
  }

  return Promise.all(updates);
}

export async function rejectOrder(orderId: string) {
  return requestAdminJson(`/orders/${orderId}`, {
    method: "PUT",
    body: JSON.stringify({ status: "Rejected" }),
  });
}

export async function updateOrderStatus(orderId: string, status: string, extraData: Record<string, any> = {}) {
  return requestAdminJson(`/orders/${orderId}`, {
    method: "PUT",
    body: JSON.stringify({ status, ...extraData }),
  });
}
