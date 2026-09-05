import { requestAdminJson } from "./adminApi";

const BASE = "/orders";

export const listenToOrders = listenOrders;

export function listenOrders(callback: (orders: any[]) => void) {
  let active = true;

  const load = async () => {
    try {
      const data = await requestAdminJson(`${BASE}`);
      if (active) callback(data);
    } catch (err) {
      console.error("Error loading admin orders:", err);
    }
  };

  load();
  const interval = setInterval(load, 5000);

  return () => {
    active = false;
    clearInterval(interval);
  };
}

export async function deleteAllCompletedOrders() {
  return await requestAdminJson(`${BASE}?completedOnly=true`, {
    method: "DELETE",
  });
}

export async function deleteAllOrders() {
  return await requestAdminJson(`${BASE}`, {
    method: "DELETE",
  });
}

export async function updateOrder(id: string, updates: any) {
  return await requestAdminJson(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function createAdminOrder(order: {
  tableId: string;
  waiterId: string;
  items: Array<{ menuItemId: string; name: string; quantity: number; price: number }>;
  total: number;
  description?: string;
}) {
  return requestAdminJson(`${BASE}`, {
    method: "POST",
    body: JSON.stringify(order),
  });
}

export async function updateOrderDiscount(orderId: string, discountData: any) {
  return await updateOrder(orderId, discountData);
}

export async function updateOrderItemPrices(orderId: string, updates: { id: string; newPrice: number }[]) {
  return requestAdminJson(`${BASE}/${orderId}/items/prices`, {
    method: "PUT",
    body: JSON.stringify({ updates }),
  });
}

export async function addOrderItems(
  orderId: string,
  items: Array<{ menuItemId?: string; name: string; quantity: number; price: number }>,
  description?: string
) {
  return await requestAdminJson(`${BASE}/${orderId}/items`, {
    method: "POST",
    body: JSON.stringify({ items, description: description?.trim() || undefined }),
  });
}

export async function removeOrderItems(orderId: string, itemIds: any[]) {
  return await requestAdminJson(`${BASE}/${orderId}/items`, {
    method: "DELETE",
    body: JSON.stringify({ itemIds }),
  });
}

export async function cancelOrder(orderId: string) {
  return await requestAdminJson(`${BASE}/${orderId}`, {
    method: "DELETE",
  });
}

export async function updateOrderSplits(orderId: string, splits: any[]) {
  return await requestAdminJson(`${BASE}/${orderId}/splits`, {
    method: "POST",
    body: JSON.stringify({ splits }),
  });
}

export async function getOrderSplits(orderId: string) {
  return await requestAdminJson(`${BASE}/${orderId}/splits`);
}
