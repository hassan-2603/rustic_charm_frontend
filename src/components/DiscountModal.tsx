import { useEffect, useMemo, useState } from "react";
import { X, Percent, IndianRupee } from "lucide-react";
import {
  splitItemsByCategory,
  buildFlatDiscountPayload,
  buildCategoryDiscountPayload,
  buildClearDiscountPayload,
  type DiscountPayload,
} from "../utils/discountUtils";

type Props = {
  open: boolean;
  order: any;
  onClose: () => void;
  onSave: (payload: DiscountPayload) => Promise<void> | void;
};

/**
 * Shared discount editor used both on the Waiter Dashboard ("My Orders")
 * and the Admin "Order Details" drawer, above the Print button.
 *
 * Two modes:
 *  - Direct Amount: a flat ₹ amount taken off the grand total.
 *  - By Category: independent % discounts for Food and Liquor (alcohol
 *    categories are detected automatically — beer/wine/liquor/cocktails).
 */
export default function DiscountModal({ open, order, onClose, onSave }: Props) {
  const [mode, setMode] = useState<"flat" | "category">("flat");
  const [flatAmount, setFlatAmount] = useState("");
  const [foodPercent, setFoodPercent] = useState("");
  const [alcoholPercent, setAlcoholPercent] = useState("");
  const [saving, setSaving] = useState(false);

  const { foodTotal, alcoholTotal } = useMemo(() => splitItemsByCategory(order?.items), [order]);

  useEffect(() => {
    if (!order) return;
    setMode(order.discountMode === "category" ? "category" : "flat");
    setFlatAmount(order.discountMode !== "category" && order.discountAmount ? String(order.discountValue ?? order.discountAmount) : "");
    setFoodPercent(order.foodDiscountPercent !== undefined && order.foodDiscountPercent !== null ? String(order.foodDiscountPercent) : "");
    setAlcoholPercent(order.alcoholDiscountPercent !== undefined && order.alcoholDiscountPercent !== null ? String(order.alcoholDiscountPercent) : "");
  }, [order, open]);

  if (!open || !order) return null;

  const orderTotal = Number(order.total || 0);

  const flatPreview = Math.max(0, Math.min(Number(flatAmount) || 0, orderTotal));
  const foodPreviewAmount = Math.round((foodTotal * (Math.max(0, Math.min(100, Number(foodPercent) || 0)))) / 100);
  const alcoholPreviewAmount = Math.round((alcoholTotal * (Math.max(0, Math.min(100, Number(alcoholPercent) || 0)))) / 100);
  const categoryPreviewTotal = foodPreviewAmount + alcoholPreviewAmount;

  const hasExistingDiscount = Boolean(order.discountAmount && order.discountAmount > 0);

  async function handleSave() {
    setSaving(true);
    try {
      let payload: DiscountPayload;
      if (mode === "flat") {
        const amount = Number(flatAmount);
        if (!flatAmount || isNaN(amount) || amount <= 0) {
          alert("Please enter a valid discount amount.");
          setSaving(false);
          return;
        }
        payload = buildFlatDiscountPayload(orderTotal, amount);
      } else {
        const foodPct = Number(foodPercent) || 0;
        const alcoholPct = Number(alcoholPercent) || 0;
        if (foodPct <= 0 && alcoholPct <= 0) {
          alert("Please enter a discount percentage for Food and/or Liquor.");
          setSaving(false);
          return;
        }
        payload = buildCategoryDiscountPayload(orderTotal, foodTotal, alcoholTotal, foodPct, alcoholPct);
      }
      await onSave(payload);
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to save discount.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      await onSave(buildClearDiscountPayload());
      setFlatAmount("");
      setFoodPercent("");
      setAlcoholPercent("");
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to clear discount.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Percent size={19} className="text-olive" />
            Apply Discount
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("flat")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${
                mode === "flat" ? "bg-olive text-white border-olive" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Direct Amount
            </button>
            <button
              type="button"
              onClick={() => setMode("category")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${
                mode === "category" ? "bg-olive text-white border-olive" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              By Category
            </button>
          </div>

          {mode === "flat" && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Discount Amount (₹)</label>
              <div className="relative">
                <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  value={flatAmount}
                  onChange={(event) => setFlatAmount(event.target.value)}
                  placeholder="e.g. 100"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-olive transition"
                />
              </div>
              <div className="flex justify-between text-sm text-gray-500 pt-1">
                <span>Order Total</span>
                <span>₹{orderTotal}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-gray-900">
                <span>Total after discount</span>
                <span>₹{Math.max(0, orderTotal - flatPreview)}</span>
              </div>
            </div>
          )}

          {mode === "category" && (
            <div className="space-y-4">
              <div className="border rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-gray-900">Food</span>
                  <span className="text-gray-500">Subtotal ₹{foodTotal}</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={foodPercent}
                    onChange={(event) => setFoodPercent(event.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl pl-3 pr-9 py-2.5 text-sm outline-none focus:border-olive transition"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
                {foodPreviewAmount > 0 && <p className="text-xs text-red-600 font-medium">-₹{foodPreviewAmount} off Food</p>}
              </div>

              <div className="border rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-gray-900">Liquor</span>
                  <span className="text-gray-500">Subtotal ₹{alcoholTotal}</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={alcoholPercent}
                    onChange={(event) => setAlcoholPercent(event.target.value)}
                    placeholder="0"
                    disabled={alcoholTotal <= 0}
                    className="w-full border border-gray-200 rounded-xl pl-3 pr-9 py-2.5 text-sm outline-none focus:border-olive transition disabled:bg-gray-50 disabled:text-gray-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
                {alcoholPreviewAmount > 0 && <p className="text-xs text-red-600 font-medium">-₹{alcoholPreviewAmount} off Liquor</p>}
                {alcoholTotal <= 0 && <p className="text-xs text-gray-400">No liquor items in this order.</p>}
              </div>

              <div className="flex justify-between text-sm font-semibold text-gray-900 pt-1 border-t">
                <span>Total after discount</span>
                <span>₹{Math.max(0, orderTotal - categoryPreviewTotal)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t flex gap-3">
          {hasExistingDiscount && (
            <button
              type="button"
              onClick={handleClear}
              disabled={saving}
              className="border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-olive hover:bg-olive/90 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
