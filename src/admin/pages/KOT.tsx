import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { listenOrders } from "../services/orderService";
import { printKOT, retryPrint } from "../services/printerService";
import type { PrintJob } from "../../services/printApi";

type KotState = { printing: boolean; result: "success" | "failed" | null; message?: string };

export default function KOT() {
  const [orders, setOrders] = useState<any[]>([]);
  const [kotStates, setKotStates] = useState<Record<string, KotState>>({});
  const [lastJobId, setLastJobId] = useState<Record<string, string>>({});

  useEffect(() => listenOrders(setOrders), []);

  async function handlePrint(order: any) {
    setKotStates((current) => ({ ...current, [order.id]: { printing: true, result: null } }));
    const outcome = await printKOT(order.id);
    if (outcome.job) setLastJobId((current) => ({ ...current, [order.id]: (outcome.job as PrintJob).id }));
    setKotStates((current) => ({
      ...current,
      [order.id]: { printing: false, result: outcome.ok ? "success" : "failed", message: outcome.message },
    }));
  }

  async function handleRetry(order: any) {
    const jobId = lastJobId[order.id];
    if (!jobId) return handlePrint(order);
    setKotStates((current) => ({ ...current, [order.id]: { printing: true, result: null } }));
    const outcome = await retryPrint(jobId, "KOT");
    setKotStates((current) => ({
      ...current,
      [order.id]: { printing: false, result: outcome.ok ? "success" : "failed", message: outcome.message },
    }));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">KOT</h1>
        <p className="text-gray-500 mt-1">Kitchen order tickets for placed orders.</p>
      </div>

      <div className="grid gap-5">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-2xl shadow-sm border p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">Order #{order.orderNumber}</h2>
                <p className="text-gray-600">Table: {order.tableLabel || order.tableReference || order.tableNumber || "--"}</p>
              </div>
              <div className="flex flex-col items-stretch sm:items-end gap-1">
                <button
                  onClick={() => handlePrint(order)}
                  disabled={kotStates[order.id]?.printing}
                  className={`flex items-center justify-center gap-2 text-white px-4 py-2 rounded-lg transition ${
                    kotStates[order.id]?.printing ? "bg-olive/70 cursor-wait" : "bg-olive hover:bg-olive/90"
                  }`}
                >
                  <Printer size={18} />
                  {kotStates[order.id]?.printing ? "Printing KOT..." : "Print KOT"}
                </button>
                {(kotStates[order.id]?.printing || kotStates[order.id]?.result) && (
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={
                        kotStates[order.id]?.result === "failed"
                          ? "text-red-600 font-medium"
                          : kotStates[order.id]?.result === "success"
                          ? "text-green-600 font-medium"
                          : "text-gray-500"
                      }
                    >
                      {kotStates[order.id]?.printing ? "Sending kot to printer..." : kotStates[order.id]?.message}
                    </span>
                    {kotStates[order.id]?.result === "failed" && (
                      <button onClick={() => handleRetry(order)} className="underline text-gray-700 hover:text-gray-900">
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 border-t pt-4 space-y-2">
              {(order.items || []).map((item: any, index: number) => (
                <div key={`${order.id}-${index}`} className="flex gap-3">
                  <span className="font-semibold">{item.quantity}x</span>
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {orders.length === 0 && <div className="bg-white rounded-2xl border p-8 text-center text-gray-500">No placed orders.</div>}
      </div>
    </div>
  );
}