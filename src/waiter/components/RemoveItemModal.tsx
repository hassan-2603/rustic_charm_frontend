import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { removeOrderItems } from "../services/waiterService";
import { printKOT } from "../services/printerService";

type Props = {
  open: boolean;
  order: any;
  onClose: () => void;
  onItemsRemoved: (updatedOrder: any) => void;
};

export default function RemoveItemModal({ open, order, onClose, onItemsRemoved }: Props) {
  const [removedQty, setRemovedQty] = useState<Record<string, number>>({});
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!open) {
      setRemovedQty({});
    }
  }, [open]);

  if (!open || !order) return null;

  const items: any[] = order.items || [];

  function handleIncrement(itemId: string, maxQty: number) {
    setRemovedQty((prev) => ({
      ...prev,
      [itemId]: Math.min((prev[itemId] || 0) + 1, maxQty),
    }));
  }

  function handleDecrement(itemId: string) {
    setRemovedQty((prev) => {
      const next = { ...prev };
      if (next[itemId] > 1) {
        next[itemId]--;
      } else {
        delete next[itemId];
      }
      return next;
    });
  }

  async function handleDone() {
    const removals = Object.entries(removedQty)
      .filter(([_, qty]) => qty > 0)
      .map(([id, quantity]) => ({ id, quantity }));

    if (removals.length === 0) {
      onClose();
      return;
    }

    const totalOrderQty = items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
    const totalRemoveQty = removals.reduce((sum, r) => sum + r.quantity, 0);

    if (totalRemoveQty >= totalOrderQty) {
      alert("Cannot remove every item from an order — cancel the order instead if it's no longer needed.");
      return;
    }

    setRemoving(true);
    try {
      const updated = await removeOrderItems(order.id, removals);
      const waiter = JSON.parse(localStorage.getItem("waiter") || "{}");
      await printKOT(order.id, waiter?.id);

      onItemsRemoved(updated);
      setRemovedQty({});
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to remove item(s) from order.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">

        <div className="flex justify-between items-center p-5 border-b">
          <div>
            <h2 className="text-xl font-bold">Remove Item</h2>
            <p className="text-sm text-gray-500">Order #{order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X />
          </button>
        </div>

        <div className="flex-1 p-5 overflow-y-auto min-h-0 space-y-3">
          {items.map((item: any, index: number) => {
            const itemId = item.id ?? String(index);
            const maxQty = Number(item.quantity) || 1;
            const currentRemoveQty = removedQty[itemId] || 0;
            const isSelected = currentRemoveQty > 0;

            return (
              <div
                key={itemId}
                className={`w-full flex items-center justify-between gap-4 border rounded-xl p-4 transition ${isSelected ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-gray-500">Ordered Qty : {maxQty}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <p className="font-semibold text-gray-400">
                    ₹{item.price} each
                  </p>
                  <div className="flex items-center border rounded-lg overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => handleDecrement(itemId)}
                      disabled={currentRemoveQty === 0}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-bold"
                    >
                      −
                    </button>
                    <div className="px-4 py-1 font-semibold min-w-[2.5rem] text-center">
                      {currentRemoveQty}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleIncrement(itemId, maxQty)}
                      disabled={currentRemoveQty === maxQty}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <p className="text-gray-500 text-center py-6">No items on this order.</p>
          )}
        </div>

        <div className="p-5 border-t flex justify-between items-center gap-4 shrink-0 bg-white">
          <p className="text-sm text-gray-500">
            {Object.keys(removedQty).length > 0 ? `${Object.values(removedQty).reduce((a, b) => a + b, 0)} item(s) to remove` : "Select items to remove"}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="border px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleDone}
              disabled={removing || Object.keys(removedQty).length === 0}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold disabled:opacity-60"
            >
              {removing ? "Printing..." : "Remove & Print KOT"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
