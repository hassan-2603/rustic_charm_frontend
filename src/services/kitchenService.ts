import { requestAdminJson } from "../admin/services/adminApi";
import { requestStaffJson } from "./staffApi";

const LOCAL_STORAGE_KEY = "rustic_kitchen_password";

export function listenKitchenOrders(callback: (orders: any[]) => void) {
  // Kitchen involvement has been removed from the order flow: orders placed
  // via the customer app, the admin "Order by Admin" page, and the waiter
  // "Order by Captain" page all go straight to the waiter for payment and
  // session close-out. The Kitchen Dashboard intentionally receives no live
  // orders any more so it can no longer gate or block that flow.
  callback([]);
  return () => {};
}

export async function updateOrderStatus(orderId: string, status: string, extraData: Record<string, any> = {}) {
  return requestStaffJson(`/orders/${orderId}`, {
    method: "PUT",
    body: JSON.stringify({ status, ...extraData }),
  });
}

export async function getKitchenCredentials() {
  const fallback = { id: "kitchen", password: localStorage.getItem(LOCAL_STORAGE_KEY) || "0000" };

  try {
    const data = await requestStaffJson("/kitchen-credentials");
    const creds = {
      id: data?.id || fallback.id,
      password: data?.password || fallback.password,
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, creds.password);
    return creds;
  } catch (error) {
    console.warn("Admin kitchen credentials fallback to localStorage:", error);
    return fallback;
  }
}

export async function verifyKitchenLogin(idInput: string, passwordInput: string) {
  const creds = await getKitchenCredentials();
  const trimmedId = idInput.trim().toLowerCase();
  const trimmedPass = passwordInput.trim();

  return trimmedId === creds.id.toLowerCase() && trimmedPass === creds.password;
}

export async function updateKitchenPassword(newPassword: string) {
  const trimmedPassword = newPassword.trim();
  localStorage.setItem(LOCAL_STORAGE_KEY, trimmedPassword);

  try {
    const data = await requestAdminJson("/kitchen-credentials", {
      method: "PUT",
      body: JSON.stringify({ password: trimmedPassword }),
    });
    return data;
  } catch (error) {
    console.warn("Admin kitchen password update fallback to localStorage:", error);
    return { id: "kitchen", password: trimmedPassword };
  }
}
