// Shared print-job client logic used by BOTH the Admin panel and the
// Waiter dashboard. Neither app has its own copy of "create a job, then
// poll it until it's done" — they each just supply their own authenticated
// request function (admin token vs plain staff request) to createPrintApi().
//
// Nothing here ever talks to a printer, an IP address, or a port. It only
// talks to the backend's print-job queue. The restaurant's print connector
// (a background service on a restaurant PC) is the only thing that ever
// reaches an actual printer.

export type PrintJobStatus = "PENDING" | "PROCESSING" | "PRINTED" | "FAILED" | "CANCELLED";

export type PrintJob = {
  id: string;
  orderId?: string | null;
  type: "BILL" | "KOT";
  status: PrintJobStatus;
  errorMessage?: string | null;
};

export type PrintOutcome = {
  job: PrintJob | null;
  /** A short, honest, user-facing phrase — never claims success it didn't earn. */
  message: string;
  ok: boolean;
};

type Requester = (path: string, options?: RequestInit) => Promise<any>;

const TERMINAL_STATUSES: PrintJobStatus[] = ["PRINTED", "FAILED", "CANCELLED"];

export function createPrintApi(request: Requester) {
  async function createPrintJob(orderId: string, type: "BILL" | "KOT", extra: Record<string, unknown> = {}): Promise<PrintJob> {
    return request("/print-jobs", {
      method: "POST",
      body: JSON.stringify({ orderId, type, ...extra }),
    });
  }

  async function getPrintJob(jobId: string): Promise<PrintJob> {
    return request(`/print-jobs/${jobId}`);
  }

  async function retryPrintJob(jobId: string): Promise<PrintJob> {
    return request(`/print-jobs/${jobId}/retry`, { method: "POST" });
  }

  /** Polls a job until it reaches a terminal state, or times out. */
  async function waitForJob(jobId: string, { timeoutMs = 20000, intervalMs = 800 }: { timeoutMs?: number; intervalMs?: number } = {}): Promise<PrintJob> {
    const start = Date.now();
    // Small initial delay: give the connector a moment before the first poll.
    await new Promise((resolve) => setTimeout(resolve, 300));
    while (Date.now() - start < timeoutMs) {
      const job = await getPrintJob(jobId);
      if (TERMINAL_STATUSES.includes(job.status)) return job;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return { id: jobId, type: "BILL", status: "FAILED", errorMessage: "Timed out waiting for the printer to respond. It may still print — check the printer or retry." };
  }

  async function printAndWait(orderId: string, type: "BILL" | "KOT", extra: Record<string, unknown> = {}): Promise<PrintOutcome> {
    let result: PrintJob | PrintJob[];
    try {
      result = await request("/print-jobs", {
        method: "POST",
        body: JSON.stringify({ orderId, type, ...extra }),
      });
    } catch (error) {
      return { job: null, ok: false, message: error instanceof Error ? error.message : "Unable to create the print job." };
    }

    // Support backend returning either a single job or an array of section KOT jobs
    const jobs = Array.isArray(result) ? result : [result];

    // If there were no items to print
    if (jobs.length === 0) {
      return { job: null, ok: true, message: `No items to print for ${type === "BILL" ? "Bill" : "KOT"}` };
    }

    // Wait for all section jobs concurrently so multi-section printing is fast
    const finalJobs = await Promise.all(jobs.map((j) => waitForJob(j.id)));
    const failedJob = finalJobs.find((fj) => fj.status !== "PRINTED");
    const representativeJob = failedJob || finalJobs[finalJobs.length - 1];

    return interpretJob(representativeJob, type);
  }

  async function retryAndWait(jobId: string, type: "BILL" | "KOT"): Promise<PrintOutcome> {
    let job: PrintJob;
    try {
      job = await retryPrintJob(jobId);
    } catch (error) {
      return { job: null, ok: false, message: error instanceof Error ? error.message : "Unable to retry the print job." };
    }
    const finalJob = await waitForJob(job.id);
    return interpretJob(finalJob, type);
  }

  function interpretJob(job: PrintJob, type: "BILL" | "KOT"): PrintOutcome {
    const label = type === "BILL" ? "Bill" : "KOT";
    if (job.status === "PRINTED") {
      return { job, ok: true, message: `${label} sent to printer` };
    }
    return { job, ok: false, message: job.errorMessage || `Unable to print ${label}` };
  }

  return { createPrintJob, getPrintJob, retryPrintJob, waitForJob, printAndWait, retryAndWait };
}
