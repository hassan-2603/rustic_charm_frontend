// Waiter-side printing.
//
// The waiter's phone NEVER talks to a printer — no IP, no port, no USB, no
// permissions, no setup on the device. Pressing "Print Bill" / "Print KOT"
// only asks the backend to queue a print job; the restaurant's one print
// connector (running on a restaurant PC) is what actually reaches the
// physical printer the admin configured in Settings.
//
// This calls the exact same shared print-job logic
// (../../services/printApi.ts) that the Admin panel uses
// (../../admin/services/printerService.ts) — the pipeline is not
// duplicated between the two apps, only the request transport differs
// (waiter uses the unauthenticated staff API; admin uses the admin-token
// API).

import { requestStaffJson } from "../../services/staffApi";
import { createPrintApi, type PrintOutcome } from "../../services/printApi";

const printApi = createPrintApi((path, options) => requestStaffJson(path, options));

export async function printBill(orderId: string, waiterId?: string): Promise<PrintOutcome> {
  return printApi.printAndWait(orderId, "BILL", waiterId ? { waiterId } : {});
}

export async function printKOT(orderId: string, waiterId?: string, extra?: Record<string, unknown>): Promise<PrintOutcome> {
  return printApi.printAndWait(orderId, "KOT", { ...(waiterId ? { waiterId } : {}), ...(extra || {}) });
}

export async function retryPrint(jobId: string, type: "BILL" | "KOT"): Promise<PrintOutcome> {
  return printApi.retryAndWait(jobId, type);
}
