import type { Offer } from "../../types";
import { requestAdminJson } from "./adminApi";

const BASE = "/offers";

export function listenToOffers(callback: (offers: Offer[]) => void) {
  const fetchOffers = async () => {
    const data = await requestAdminJson(`${BASE}`);
    callback(data);
  };

  fetchOffers().catch((err) => console.error("Error loading offers:", err));

  const interval = setInterval(() => {
    fetchOffers().catch((err) => console.error("Error loading offers:", err));
  }, 60000);

  return () => clearInterval(interval);
}

export async function getOffers(): Promise<Offer[]> {
  return await requestAdminJson(`${BASE}`);
}

export async function addOffer(offer: Omit<Offer, "id">) {
  return await requestAdminJson(`${BASE}`, {
    method: "POST",
    body: JSON.stringify(offer),
  });
}

export async function updateOffer(id: string, updates: Partial<Offer>) {
  return await requestAdminJson(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteOffer(id: string) {
  return await requestAdminJson(`${BASE}/${id}`, {
    method: "DELETE",
  });
}
