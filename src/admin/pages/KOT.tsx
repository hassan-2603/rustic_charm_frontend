import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { listenOrders } from "../services/orderService";
import { printKOTThroughConnector } from "../services/printerService";

export default function KOT() {
  const [orders, setOrders] = useState<any[]>([]);
  const [printingId, setPrintingId] = useState<string | null>(null);

  useEffect(() => listenOrders(setOrders), []);

  async function handlePrint(order: any) {
    setPrintingId(order.id);
    try {
      await printKOTThroughConnector(order);
    } catch (error) {
      alert(error instanceof Error ? error.message : "KOT print failed.");
    } finally {
      setPrintingId(null);
    }
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
              <button
                onClick={() => handlePrint(order)}
                disabled={printingId === order.id}
                className={`flex items-center justify-center gap-2 text-white px-4 py-2 rounded-lg transition ${
                  printingId === order.id ? "bg-olive/70 cursor-wait" : "bg-olive hover:bg-olive/90"
                }`}
              >
                <Printer size={18} />
                {printingId === order.id ? "Printing..." : "Print KOT"}
              </button>
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