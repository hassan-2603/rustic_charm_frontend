import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { removeOrderItems } from "../services/orderApi";

type Props = {
  open: boolean;
  order: any;
  onClose: () => void;
  onItemsRemoved: (updatedOrder: any) => void;
};

export default function RemoveItemModal({ open, order, onClose, onItemsRemoved }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
    }
  }, [open]);

  if (!open || !order) return null;

  const items: any[] = order.items || [];

  function toggleItem(itemId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  async function handleDone() {
    if (selectedIds.size === 0) {
      onClose();
      return;
    }
    if (selectedIds.size >= items.length) {
      alert("Cannot remove every item from an order — cancel the order instead if it's no longer needed.");
      return;
    }
    setRemoving(true);
    try {
      const updated = await removeOrderItems(order.id, Array.from(selectedIds));
      onItemsRemoved(updated);
      setSelectedIds(new Set());
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to remove item(s) from order.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        <div className="flex justify-between items-center p-5 border-b">
          <div>
            <h2 className="text-xl font-bold">Remove Item</h2>
            <p className="text-sm text-gray-500">Order #{order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3">
          {items.map((item: any, index: number) => {
            const itemId = item.id ?? String(index);
            const isSelected = selectedIds.has(itemId);
            return (
              <button
                key={itemId}
                type="button"
                onClick={() => toggleItem(itemId)}
                className={`w-full text-left flex items-center justify-between gap-4 border rounded-xl p-4 transition ${
                  isSelected ? "border-red-500 bg-red-50" : "hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "bg-red-500 border-red-500" : "border-gray-300"
                    }`}
                  >
                    {isSelected && <Check size={14} className="text-white" />}
                  </span>
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-gray-500">Qty : {item.quantity}</p>
                  </div>
                </div>
                <p className="font-semibold">₹{item.price * item.quantity}</p>
              </button>
            );
          })}
          {items.length === 0 && (
            <p className="text-gray-500 text-center py-6">No items on this order.</p>
          )}
        </div>

        <div className="p-5 border-t flex justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            {selectedIds.size > 0 ? `${selectedIds.size} item(s) selected` : "Select items to remove"}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="border px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleDone}
              disabled={removing || selectedIds.size === 0}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold disabled:opacity-60"
            >
              {removing ? "Removing..." : "Done"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
