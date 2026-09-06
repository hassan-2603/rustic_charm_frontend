// Admin-side printer configuration + printing.
//
// IMPORTANT: this file does NOT talk to a printer, an IP address, or a
// port directly, and never did any browser-to-LAN networking after this
// change. It only talks to the backend's /api/admin/printers and
// /api/admin/print-jobs endpoints. The restaurant's print connector
// (a background service on a restaurant PC) is the only thing that ever
// reaches an actual printer — see /connector/README.md.
//
// The waiter dashboard's printing (../../waiter/services/printerService.ts)
// calls the exact same shared logic in ../../services/printApi.ts — the
// two apps never duplicate printer logic between them.

import { requestAdminJson } from "./adminApi";
import { createPrintApi, type PrintJob, type PrintOutcome } from "../../services/printApi";

export type PrinterConnectionType = "network" | "windows";
export type PaperWidth = "58mm" | "80mm";

export type PrinterSettings = {
  printerName: string;
  connectionType: PrinterConnectionType;
  ipAddress: string;
  port: number | null;
  paperWidth: PaperWidth;
  copies: number;
  autoCut: boolean;
  autoPrint: boolean;
};

export type PrinterStatus = PrinterSettings & {
  configured: boolean;
  status: "READY" | "OFFLINE";
  lastSeenAt: string | null;
};

export type PrinterType = "bill" | "kot";

const printApi = createPrintApi((path, options) => requestAdminJson(path, options));

/** GET both printers' saved settings + LIVE reachability (not just "configured"). */
export async function getPrinters(): Promise<{ bill: PrinterStatus | null; kot: PrinterStatus | null }> {
  return requestAdminJson("/printers");
}

export async function savePrinterSettings(type: PrinterType, settings: PrinterSettings): Promise<PrinterStatus> {
  return requestAdminJson(`/printers/${type}`, {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

/** Test Bill / Test KOT — goes through the real job queue + connector, but never touches an order. */
export async function testPrinter(type: PrinterType): Promise<PrintOutcome> {
  const job: PrintJob = await requestAdminJson(`/printers/${type}/test`, { method: "POST" });
  const finalJob = await printApi.waitForJob(job.id, { timeoutMs: 15000 });
  if (finalJob.status === "PRINTED") {
    return { job: finalJob, ok: true, message: "Test print sent successfully." };
  }
  return { job: finalJob, ok: false, message: finalJob.errorMessage || "Test print failed." };
}

/** Admin panel's Print Bill / Print KOT buttons. Same pipeline the waiter uses. */
export async function printBill(orderId: string): Promise<PrintOutcome> {
  return printApi.printAndWait(orderId, "BILL");
}

export async function printKOT(orderId: string, extra?: Record<string, unknown>): Promise<PrintOutcome> {
  return printApi.printAndWait(orderId, "KOT", extra || {});
}

export async function retryPrint(jobId: string, type: "BILL" | "KOT"): Promise<PrintOutcome> {
  return printApi.retryAndWait(jobId, type);
}

export async function getFailedPrintJobs(): Promise<PrintJob[]> {
  return requestAdminJson("/print-jobs/failed");
}
