export type PrinterSettings = {
  printerName: string;
  connectionType: "network" | "windows";
  ipAddress: string;
  port: number;
  paperWidth: "80mm";
  autoCut: boolean;
};

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  printerName: "Rustic Charm Printer",
  connectionType: "network",
  ipAddress: "",
  port: 9100,
  paperWidth: "80mm",
  autoCut: true,
};

export const BILL_PRINTER_SETTINGS: PrinterSettings = {
  printerName: "80 Printer",
  connectionType: "network",
  ipAddress: "192.168.0.20",
  port: 9100,
  paperWidth: "80mm",
  autoCut: true,
};

export const KOT_PRINTER_SETTINGS: PrinterSettings = {
  printerName: "KOT",
  connectionType: "network",
  ipAddress: "192.168.0.10",
  port: 9100,
  paperWidth: "80mm",
  autoCut: true,
};

const STORAGE_KEY = "rustic_charm_printer_settings";
const CAPTAIN_NAME_KEY = "rustic_charm_captain_name";
const CONNECTOR_URL = "http://192.168.0.122:17890";

export function getCaptainName() {
  return localStorage.getItem(CAPTAIN_NAME_KEY) || "";
}

export function saveCaptainName(name: string) {
  localStorage.setItem(CAPTAIN_NAME_KEY, name.trim());
}

export function getPrinterSettings(): PrinterSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return { ...DEFAULT_PRINTER_SETTINGS, ...saved };
  } catch {
    return DEFAULT_PRINTER_SETTINGS;
  }
}

export function savePrinterSettings(settings: PrinterSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function toPrintBill(order: any) {
  return {
    orderNumber: order.orderNumber,
    tableNumber: order.tableLabel || order.tableReference || order.tableNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    waiterName: order.waiterName,
    date: (order.createdAt?.toDate?.() || new Date()).toLocaleString(),
    items: (order.items || []).map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
      price: Number(item.price || 0),
      amount: item.price * item.quantity,
    })),
    total: order.total,
    discountAmount: order.discountAmount || 0,
    finalTotal: order.finalTotal,
  };
}

async function connectorRequest(path: string, body: unknown, timeoutMs = 2500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${CONNECTOR_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Print connector failed");
    return result;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Print connector not reachable");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function testPrinter(settings: PrinterSettings) {
  return connectorRequest("/test-print", { settings });
}

export async function printBillThroughConnector(order: any) {
  return connectorRequest("/print", {
    settings: BILL_PRINTER_SETTINGS,
    printType: "bill",
    bill: toPrintBill(order),
  });
}

export async function printKOTThroughConnector(order: any) {
  return connectorRequest("/print", {
    settings: KOT_PRINTER_SETTINGS,
    printType: "kot",
    kot: {
      orderNumber: order.orderNumber,
      tableNumber: order.tableLabel || order.tableReference || order.tableNumber,
      waiterName: order.waiterName,
      date: (order.createdAt?.toDate?.() || new Date()).toLocaleString(),
      items: (order.items || []).map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
      })),
    },
  });
}