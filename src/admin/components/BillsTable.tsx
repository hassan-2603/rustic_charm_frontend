import { useState } from "react";
import { Printer } from "lucide-react";
import { printBill, retryPrint } from "../services/printerService";
import { openReceiptPreview } from "../../utils/receiptPreview";
import type { PrintJob } from "../../services/printApi";

type Props = {
  orders: any[];
};

type BillPrintState = { printing: boolean; result: "success" | "failed" | null; message?: string };

// Bill printing here goes through the exact same backend print-job queue +
// restaurant print connector as the Admin Order drawer, the KOT page, and
// the waiter dashboard (see ../../services/printApi.ts). There is no
// browser-print fallback: if the connector can't reach the printer, the
// status below says so honestly (with Retry / Preview), it never silently
// opens a print dialog or claims a print that didn't happen.
export default function BillsTable({ orders }: Props) {
  const [billStates, setBillStates] = useState<Record<string, BillPrintState>>({});
  const [lastJobId, setLastJobId] = useState<Record<string, string>>({});

  async function handlePrintBill(order: any) {
    setBillStates((current) => ({ ...current, [order.id]: { printing: true, result: null } }));
    const outcome = await printBill(order.id);
    if (outcome.job) setLastJobId((current) => ({ ...current, [order.id]: (outcome.job as PrintJob).id }));
    setBillStates((current) => ({
      ...current,
      [order.id]: { printing: false, result: outcome.ok ? "success" : "failed", message: outcome.message },
    }));
  }

  async function handleRetryBill(order: any) {
    const jobId = lastJobId[order.id];
    if (!jobId) return handlePrintBill(order);
    setBillStates((current) => ({ ...current, [order.id]: { printing: true, result: null } }));
    const outcome = await retryPrint(jobId, "BILL");
    setBillStates((current) => ({
      ...current,
      [order.id]: { printing: false, result: outcome.ok ? "success" : "failed", message: outcome.message },
    }));
  }

  function handlePreviewBill(order: any) {
    openReceiptPreview(order, "BILL");
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">

      <table className="w-full">

        <thead className="bg-gray-50">

          <tr>

            <th className="text-left p-5">Order</th>

            <th className="text-left p-5">Waiter</th>

            <th className="text-left p-5">Total</th>

            <th className="text-left p-5">Status</th>

            <th className="text-right p-5">Action</th>

          </tr>

        </thead>

        <tbody>

          {orders.map((order) => {
            const state = billStates[order.id];
            const printing = !!state?.printing;
            const failed = state?.result === "failed";
            const succeeded = state?.result === "success";

            return (
              <tr
                key={order.id}
                className="border-t hover:bg-gray-50"
              >

                <td className="p-5">
                  {order.orderNumber}
                </td>

                <td className="p-5">
                  {order.waiterName}
                </td>

                <td className="p-5 font-semibold">
                  ₹{order.finalTotal ?? order.total}
                </td>

                <td className="p-5">
                  {order.status}
                </td>

                <td className="p-5">

                  <div className="flex flex-col items-end gap-1">

                    <button
                      onClick={() => handlePrintBill(order)}
                      disabled={printing}
                      className={`flex items-center gap-2 text-white px-4 py-2 rounded-lg transition ${
                        printing ? "bg-olive/70 cursor-wait" : "bg-olive hover:bg-olive/90"
                      }`}
                    >
                      <Printer size={18} />

                      {printing ? "Printing..." : "Print"}

                    </button>

                    {(printing || state?.result) && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className={failed ? "text-red-600 font-medium" : succeeded ? "text-green-600 font-medium" : "text-gray-500"}>
                          {printing ? "Sending bill to printer..." : state?.message}
                        </span>
                        {failed && (
                          <>
                            <button onClick={() => handleRetryBill(order)} className="underline text-gray-700 hover:text-gray-900">
                              Retry
                            </button>
                            <button onClick={() => handlePreviewBill(order)} className="underline text-gray-700 hover:text-gray-900">
                              Preview
                            </button>
                          </>
                        )}
                      </div>
                    )}

                  </div>

                </td>

              </tr>
            );
          })}

        </tbody>

      </table>

    </div>
  );
}