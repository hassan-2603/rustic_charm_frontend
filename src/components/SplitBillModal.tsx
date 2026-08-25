import { useEffect, useState } from "react";
import { X, Plus, Minus, Trash2 } from "lucide-react";

interface SplitBill {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  order: any;
  onClose: () => void;
  onSave: (splits: any[]) => Promise<void>;
}

export default function SplitBillModal({ open, order, onClose, onSave }: Props) {
  const [bills, setBills] = useState<SplitBill[]>([
    { id: "1", name: "Bill 1" },
    { id: "2", name: "Bill 2" },
  ]);
  // allocations[itemIndex][billId] = quantity assigned to that bill
  const [allocations, setAllocations] = useState<Record<number, Record<string, number>>>({});
  const [saving, setSaving] = useState(false);

  // Reset when the modal opens
  useEffect(() => {
    if (!open || !order?.items) return;
    const init: Record<number, Record<string, number>> = {};
    order.items.forEach((_: any, i: number) => {
      init[i] = { "1": order.items[i].quantity, "2": 0 };
    });
    setAllocations(init);
    setBills([{ id: "1", name: "Bill 1" }, { id: "2", name: "Bill 2" }]);
  }, [open, order]);

  if (!open || !order) return null;

  const changeQty = (itemIdx: number, billId: string, delta: number) => {
    setAllocations((prev) => {
      const cur = prev[itemIdx]?.[billId] ?? 0;
      const newVal = cur + delta;
      if (newVal < 0) return prev;
      const totalOthers = Object.entries(prev[itemIdx] ?? {}).reduce(
        (s, [bid, q]) => (bid === billId ? s : s + q),
        0
      );
      if (totalOthers + newVal > order.items[itemIdx].quantity) return prev;
      return { ...prev, [itemIdx]: { ...(prev[itemIdx] ?? {}), [billId]: newVal } };
    });
  };

  const addBill = () => {
    const newId = String(bills.length + 1);
    setBills((prev) => [...prev, { id: newId, name: `Bill ${newId}` }]);
    setAllocations((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        next[+k] = { ...next[+k], [newId]: 0 };
      });
      return next;
    });
  };

  const removeBill = (id: string) => {
    if (bills.length <= 2) return;
    const fallback = bills.find((b) => b.id !== id)!.id;
    setBills((prev) => prev.filter((b) => b.id !== id));
    setAllocations((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        const obj = { ...next[+k] };
        obj[fallback] = (obj[fallback] ?? 0) + (obj[id] ?? 0);
        delete obj[id];
        next[+k] = obj;
      });
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const splits = bills
        .map((b, bIdx) => {
          const items: any[] = [];
          let subtotal = 0;
          order.items.forEach((it: any, i: number) => {
            const qty = allocations[i]?.[b.id] ?? 0;
            if (qty > 0) {
              items.push({ ...it, quantity: qty });
              subtotal += it.price * qty;
            }
          });
          return { billNumber: bIdx + 1, items, subtotal, tax: 0, total: subtotal };
        })
        .filter((s) => s.items.length > 0);
      await onSave(splits);
      onClose();
    } catch (e: any) {
      alert(e.message || "Failed to save splits");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-2xl font-bold">Split Bill</h2>
            <p className="text-sm text-gray-500">Order #{order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X size={22} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1 border rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-center">Qty</th>
                {bills.map((b) => (
                  <th key={b.id} className="px-4 py-3 text-center min-w-[130px]">
                    <div className="flex items-center justify-center gap-1">
                      {b.name}
                      {bills.length > 2 && (
                        <button
                          onClick={() => removeBill(b.id)}
                          className="ml-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {(order.items ?? []).map((it: any, i: number) => {
                const assigned = Object.values(allocations[i] ?? {}).reduce(
                  (s: number, q: any) => s + q,
                  0
                );
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{it.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={
                          assigned < it.quantity
                            ? "text-orange-500 font-bold"
                            : "text-green-600 font-semibold"
                        }
                      >
                        {assigned}/{it.quantity}
                      </span>
                    </td>
                    {bills.map((b) => (
                      <td key={b.id} className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => changeQty(i, b.id, -1)}
                            disabled={(allocations[i]?.[b.id] ?? 0) === 0}
                            className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-7 text-center font-semibold">
                            {allocations[i]?.[b.id] ?? 0}
                          </span>
                          <button
                            onClick={() => changeQty(i, b.id, 1)}
                            disabled={assigned >= it.quantity}
                            className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer totals + add bill */}
        <div className="mt-4 flex flex-wrap gap-4 bg-gray-50 rounded-xl p-4 items-center justify-between">
          <button
            onClick={addBill}
            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 text-sm"
          >
            <Plus size={15} /> Add another bill
          </button>
          <div className="flex gap-6">
            {bills.map((b) => {
              const subtotal = (order.items ?? []).reduce(
                (s: number, it: any, i: number) =>
                  s + (allocations[i]?.[b.id] ?? 0) * it.price,
                0
              );
              return (
                <div key={b.id} className="text-right">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">{b.name}</div>
                  <div className="font-bold text-lg">₹{subtotal.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl border font-semibold hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            {saving ? "Saving…" : "💾 Save Split"}
          </button>
        </div>
      </div>
    </div>
  );
}
