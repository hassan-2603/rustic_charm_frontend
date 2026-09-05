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
  const interval = setInterval(load, 20000);

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
  description?: string;
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

export async function freeTable(tableId: string) {
  return requestAdminJson(`/tables/${tableId}`, {
    method: "PUT",
    body: JSON.stringify({ occupied: false, status: "available", currentOrderId: "", currentSessionId: "" }),
  });
}

export async function savePaymentAndEndSession(order: any, paymentMethod: string) {
  const updates: Promise<any>[] = [];

  // Mark order as Completed with paymentMethod and completedAt
  updates.push(
    requestAdminJson(`/orders/${order.id}`, {
      method: "PUT",
      body: JSON.stringify({
        status: "Completed",
        paymentStatus: "Paid",
        paymentMethod: paymentMethod,
        completedAt: new Date().toISOString(),
      }),
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
      // best-effort: don't fail the whole operation just because table lookup failed
    }
  }

  return Promise.all(updates);
}

export async function endSession(order: any, paymentMethod: string = "Cash") {
  return savePaymentAndEndSession(order, order.paymentMethod || paymentMethod);
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

export async function updateOrderItemPrices(orderId: string, updates: { id: string; newPrice: number }[]) {
  return requestAdminJson(`/orders/${orderId}/items/prices`, {
    method: "PUT",
    body: JSON.stringify({ updates }),
  });
}

export async function updateOrderDiscount(orderId: string, discountData: Record<string, any>) {
  return requestAdminJson(`/orders/${orderId}`, {
    method: "PUT",
    body: JSON.stringify(discountData),
  });
}

export async function addOrderItems(
  orderId: string,
  items: Array<{ menuItemId?: string; name: string; quantity: number; price: number }>,
  description?: string
) {
  return requestAdminJson(`/orders/${orderId}/items`, {
    method: "POST",
    body: JSON.stringify({ items, description: description?.trim() || undefined }),
  });
}

export async function removeOrderItems(orderId: string, itemIds: any[]) {
  return requestAdminJson(`/orders/${orderId}/items`, {
    method: "DELETE",
    body: JSON.stringify({ itemIds }),
  });
}

export async function cancelOrder(orderId: string) {
  return requestAdminJson(`/orders/${orderId}`, {
    method: "DELETE",
  });
}


export async function updateOrderSplits(orderId: string, splits: any[]) {
  return requestAdminJson(`/orders/${orderId}/splits`, {
    method: "POST",
    body: JSON.stringify({ splits }),
  });
}
