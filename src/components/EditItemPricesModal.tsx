import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { getLocalizedField } from "../types";

type Props = {
  open: boolean;
  order: any;
  onClose: () => void;
  onSave: (updates: { id: string; newPrice: number }[]) => Promise<void>;
};

export default function EditItemPricesModal({ open, order, onClose, onSave }: Props) {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && order?.items) {
      const initial: Record<string, string> = {};
      order.items.forEach((item: any, i: number) => {
        initial[item.id || i] = String(item.price || 0);
      });
      setPrices(initial);
    }
  }, [open, order]);

  if (!open || !order) return null;

  async function handleSave() {
    const updates = Object.keys(prices).map((key) => ({
      id: key,
      newPrice: Number(prices[key]) || 0,
    }));
    setSaving(true);
    try {
      await onSave(updates);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update prices.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Edit Item Prices</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {order.items?.map((item: any, index: number) => {
            const rowKey = item.id || index;
            return (
              <div key={rowKey} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 p-2 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-semibold">{getLocalizedField(item.name, "English")}</p>
                  <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-500">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-24 border rounded-lg px-2 py-1 focus:ring-2 focus:ring-olive focus:outline-none bg-white"
                    value={prices[rowKey] || ""}
                    onChange={(e) => setPrices({ ...prices, [rowKey]: e.target.value })}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-5 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-semibold border hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl font-semibold bg-olive text-white disabled:opacity-50">
            {saving ? "Saving..." : "Save Prices"}
          </button>
        </div>
      </div>
    </div>
  );
}
