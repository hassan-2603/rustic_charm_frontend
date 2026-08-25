import { requestAdminJson } from "../admin/services/adminApi";

export async function getMenuVersion() {
  try {
    const data = await requestAdminJson("/settings/menu-version");
    return (data && data.menuVersion) || 1;
  } catch (error) {
    console.error("Failed to fetch menu version:", error);
    return 1;
  }
}

export async function increaseMenuVersion() {
  try {
    await requestAdminJson("/settings/menu-version", { method: "PUT" });
  } catch (error) {
    console.error("Failed to increase menu version:", error);
    throw error;
  }
}

export async function getKotSections() {
  try {
    const data = await requestAdminJson("/settings/kot-sections");
    return data || {};
  } catch (error) {
    console.error("Failed to fetch KOT sections:", error);
    return {};
  }
}

export async function setKotSections(config: Record<string, string>) {
  try {
    const data = await requestAdminJson("/settings/kot-sections", {
      method: "PUT",
      body: JSON.stringify(config),
    });
    return data;
  } catch (error) {
    console.error("Failed to update KOT sections:", error);
    throw error;
  }
}

export async function getBillSections() {
  try {
    const data = await requestAdminJson("/settings/bill-sections");
    return data || {};
  } catch (error) {
    console.error("Failed to fetch Bill sections:", error);
    return {};
  }
}

export async function setBillSections(config: Record<string, string>) {
  try {
    const data = await requestAdminJson("/settings/bill-sections", {
      method: "PUT",
      body: JSON.stringify(config),
    });
    return data;
  } catch (error) {
    console.error("Failed to update Bill sections:", error);
    throw error;
  }
}