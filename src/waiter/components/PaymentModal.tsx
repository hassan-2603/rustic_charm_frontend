import { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  UtensilsCrossed,
  CheckCircle2,
  Loader2,
  Coins,
  AlertCircle,
  Sparkles,
} from "lucide-react";

type Props = {
  open: boolean;
  order: any;
  onClose: () => void;
  onSavePayment: (
    order: any,
    paymentMethod: string,
    splits?: Record<string, number>,
    tipAmount?: number
  ) => Promise<void>;
};

const PAYMENT_METHODS = [
  {
    id: "Cash",
    label: "Cash",
    icon: Banknote,
    color: "emerald",
    bgClass: "hover:border-emerald-500 hover:bg-emerald-50/60",
    selectedClass: "border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-900",
    iconColor: "text-emerald-600",
  },
  {
    id: "UPI",
    label: "UPI",
    icon: QrCode,
    color: "purple",
    bgClass: "hover:border-purple-500 hover:bg-purple-50/60",
    selectedClass: "border-purple-600 bg-purple-50/80 ring-2 ring-purple-500/20 text-purple-900",
    iconColor: "text-purple-600",
  },
  {
    id: "Card",
    label: "Card",
    icon: CreditCard,
    color: "blue",
    bgClass: "hover:border-blue-500 hover:bg-blue-50/60",
    selectedClass: "border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 text-blue-900",
    iconColor: "text-blue-600",
  },
  {
    id: "Zomato",
    label: "Zomato",
    icon: UtensilsCrossed,
    color: "red",
    bgClass: "hover:border-red-500 hover:bg-red-50/60",
    selectedClass: "border-red-600 bg-red-50/80 ring-2 ring-red-500/20 text-red-900",
    iconColor: "text-red-600",
  },
];

export default function PaymentModal({
  open,
  order,
  onClose,
  onSavePayment,
}: Props) {
  const [selectedMethods, setSelectedMethods] = useState<string[]>(["Cash"]);
  const [amounts, setAmounts] = useState<Record<string, string>>({ Cash: "" });
  const [showTip, setShowTip] = useState(false);
  const [tipAmount, setTipAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (order && open) {
      const splits = order.paymentSplits
        ? typeof order.paymentSplits === "string"
          ? JSON.parse(order.paymentSplits)
          : order.paymentSplits
        : null;

      if (splits && Object.keys(splits).length > 0) {
        const active = Object.keys(splits).filter((k) => Number(splits[k]) > 0);
        setSelectedMethods(active.length > 0 ? active : [order.paymentMethod || "Cash"]);
        const loadedAmounts: Record<string, string> = {};
        for (const k of active) {
          loadedAmounts[k] = String(splits[k]);
        }
        setAmounts(loadedAmounts);
      } else {
        const initialMethod = order.paymentMethod || "Cash";
        setSelectedMethods([initialMethod]);
        setAmounts({ [initialMethod]: "" });
      }

      const initialTip = Number(order.tipAmount || order.tip || 0);
      if (initialTip > 0) {
        setShowTip(true);
        setTipAmount(String(initialTip));
      } else {
        setShowTip(false);
        setTipAmount("");
      }

      setIsSaving(false);
    }
  }, [order, open]);

  if (!open || !order) return null;

  const totalAmount = Number(order.finalTotal ?? order.total) || 0;
  const originalTotal = Number(order.total) || 0;
  const hasDiscount = Boolean(order.discountAmount && order.discountAmount > 0);
  const itemCount = (order.items || []).reduce(
    (acc: number, item: any) => acc + (Number(item.quantity) || 1),
    0
  );
  const tableDisplay =
    order.tableLabel || order.tableReference || `Table ${order.tableNumber || "--"}`;

  function toggleMethod(methodId: string) {
    if (selectedMethods.includes(methodId)) {
      if (selectedMethods.length === 1) {
        setSelectedMethods([]);
        setAmounts((prev) => {
          const next = { ...prev };
          delete next[methodId];
          return next;
        });
      } else {
        setSelectedMethods((prev) => prev.filter((m) => m !== methodId));
        setAmounts((prev) => {
          const next = { ...prev };
          delete next[methodId];
          return next;
        });
      }
    } else {
      setSelectedMethods((prev) => [...prev, methodId]);
      setAmounts((prev) => ({
        ...prev,
        [methodId]: prev[methodId] || "",
      }));
    }
  }

  function handleAmountChange(methodId: string, val: string) {
    if (val !== "" && !/^\d*\.?\d*$/.test(val)) return;
    setAmounts((prev) => ({
      ...prev,
      [methodId]: val,
    }));
  }

  // Calculate current entered total
  const enteredSum = selectedMethods.reduce((acc, m) => {
    const val = parseFloat(amounts[m] || "0");
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const remaining = Math.round((totalAmount - enteredSum) * 100) / 100;

  function handleFillRemaining(methodId: string) {
    const otherSum = selectedMethods
      .filter((m) => m !== methodId)
      .reduce((acc, m) => acc + (parseFloat(amounts[m] || "0") || 0), 0);
    const toFill = Math.max(0, Math.round((totalAmount - otherSum) * 100) / 100);
    setAmounts((prev) => ({
      ...prev,
      [methodId]: String(toFill),
    }));
  }

  async function handleSave() {
    if (selectedMethods.length === 0) {
      alert("Please select at least one payment method.");
      return;
    }

    const finalSplits: Record<string, number> = {};
    let finalMethod = "";

    if (selectedMethods.length === 1) {
      const single = selectedMethods[0];
      const entered = parseFloat(amounts[single] || "");
      // Requirement: if they choose just one option and without entering any amount they clicked save, that option will contain total amount.
      if (isNaN(entered) || entered <= 0) {
        finalSplits[single] = totalAmount;
      } else {
        finalSplits[single] = entered;
      }
      finalMethod = single;
    } else {
      // Multiple options: check if exactly one option is empty and others have values
      const emptyMethods = selectedMethods.filter(
        (m) => !amounts[m] || parseFloat(amounts[m]) <= 0
      );

      const workingAmounts = { ...amounts };

      if (emptyMethods.length === 1) {
        const sumFilled = selectedMethods
          .filter((m) => m !== emptyMethods[0])
          .reduce((acc, m) => acc + (parseFloat(amounts[m] || "0") || 0), 0);
        if (sumFilled < totalAmount) {
          workingAmounts[emptyMethods[0]] = String(
            Math.round((totalAmount - sumFilled) * 100) / 100
          );
        }
      }

      let multiSum = 0;
      for (const m of selectedMethods) {
        const amt = parseFloat(workingAmounts[m] || "0") || 0;
        finalSplits[m] = amt;
        multiSum += amt;
      }

      multiSum = Math.round(multiSum * 100) / 100;
      if (Math.abs(multiSum - totalAmount) > 0.01) {
        alert(
          `Total of entered amounts (₹${multiSum}) does not match the payable bill amount (₹${totalAmount}). Please adjust the amounts.`
        );
        return;
      }

      finalMethod = `Split (${selectedMethods
        .map((m) => `${m}: ₹${finalSplits[m]}`)
        .join(", ")})`;
    }

    const parsedTip = showTip ? parseFloat(tipAmount) || 0 : 0;

    setIsSaving(true);
    try {
      await onSavePayment(order, finalMethod, finalSplits, parsedTip);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unable to complete payment.");
      setIsSaving(false);
    }
  }

  const parsedTipValue = showTip ? parseFloat(tipAmount) || 0 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-olive">
              Payment & End Session
            </span>
            <h2 className="text-xl font-bold text-gray-900 mt-0.5">
              {tableDisplay} • #{order.orderNumber}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Bill Total Banner */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/80 rounded-2xl p-4 text-center">
            <span className="text-xs font-medium text-amber-800 uppercase tracking-wider">
              Total Payable ({itemCount} {itemCount === 1 ? "item" : "items"})
            </span>
            <div className="text-3xl font-extrabold text-amber-950 mt-1">
              ₹{totalAmount.toLocaleString()}
            </div>
            {hasDiscount && (
              <div className="text-xs text-amber-700 mt-1 font-medium">
                <span className="line-through text-gray-400 mr-2">
                  ₹{originalTotal.toLocaleString()}
                </span>
                <span>(Saved ₹{Number(order.discountAmount).toLocaleString()})</span>
              </div>
            )}
          </div>

          {/* Payment Methods */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">
                Choose Payment Method(s)
              </label>
              {selectedMethods.length > 1 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Split Payment Active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Select one or multiple options. Enter amounts for split payments. If single option selected without amount, it gets the full total.
            </p>

            <div className="space-y-2.5">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedMethods.includes(method.id);
                return (
                  <div
                    key={method.id}
                    className={`rounded-2xl border-2 transition-all p-3 ${
                      isSelected
                        ? method.selectedClass
                        : `border-gray-200 bg-white text-gray-700 ${method.bgClass}`
                    }`}
                  >
                    <div
                      onClick={() => !isSaving && toggleMethod(method.id)}
                      className="flex items-center gap-3 cursor-pointer select-none"
                    >
                      <div
                        className={`p-2 rounded-xl ${
                          isSelected ? "bg-white shadow-sm" : "bg-gray-100"
                        }`}
                      >
                        <Icon size={18} className={method.iconColor} />
                      </div>
                      <span className="font-semibold text-sm">{method.label}</span>
                      {isSelected ? (
                        <CheckCircle2
                          size={18}
                          className={`ml-auto ${method.iconColor}`}
                        />
                      ) : (
                        <div className="ml-auto w-4 h-4 rounded-full border-2 border-gray-300" />
                      )}
                    </div>

                    {/* Amount Input Box (Appears when clicked/selected) */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">
                            ₹
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={amounts[method.id] ?? ""}
                            onChange={(e) => handleAmountChange(method.id, e.target.value)}
                            placeholder={
                              selectedMethods.length === 1
                                ? `Default: ₹${totalAmount}`
                                : "Enter amount"
                            }
                            disabled={isSaving}
                            className="w-full pl-7 pr-3 py-2 text-sm font-semibold bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-olive/40 focus:border-olive"
                          />
                        </div>

                        {selectedMethods.length > 1 && remaining > 0 && (
                          <button
                            type="button"
                            onClick={() => handleFillRemaining(method.id)}
                            className="text-xs px-2.5 py-2 font-medium bg-white hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-300 shrink-0 transition"
                          >
                            Fill ₹{remaining}
                          </button>
                        )}
                        {selectedMethods.length === 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setAmounts({ [method.id]: String(totalAmount) })
                            }
                            className="text-xs px-2.5 py-2 font-medium bg-white hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-300 shrink-0 transition"
                          >
                            Full ₹{totalAmount}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Split Balance Summary Indicator */}
            {selectedMethods.length > 1 && (
              <div
                className={`mt-3 p-3 rounded-xl border text-xs flex items-center justify-between font-medium ${
                  Math.abs(remaining) < 0.01
                    ? "bg-green-50 border-green-200 text-green-800"
                    : remaining > 0
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                <span>
                  Entered: ₹{enteredSum.toLocaleString()} / ₹{totalAmount.toLocaleString()}
                </span>
                <span>
                  {Math.abs(remaining) < 0.01
                    ? "✓ Exact Total Allocated"
                    : remaining > 0
                    ? `₹${remaining.toLocaleString()} remaining`
                    : `₹${Math.abs(remaining).toLocaleString()} over total`}
                </span>
              </div>
            )}
          </div>

          {/* Tip Option */}
          <div className="border border-gray-200 rounded-2xl p-3.5 bg-gray-50/60">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowTip(!showTip);
                  if (showTip) setTipAmount("");
                }}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition"
              >
                <div className={`p-1.5 rounded-lg ${showTip ? "bg-amber-100 text-amber-700" : "bg-gray-200 text-gray-600"}`}>
                  <Coins size={16} />
                </div>
                <span>{showTip ? "Tip / Gratuity Added" : "+ Add Tip / Gratuity"}</span>
              </button>

              {showTip && (
                <button
                  type="button"
                  onClick={() => {
                    setShowTip(false);
                    setTipAmount("");
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Remove
                </button>
              )}
            </div>

            {showTip && (
              <div className="mt-3 pt-3 border-t border-gray-200/80 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">
                    ₹
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={tipAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d*\.?\d*$/.test(val)) setTipAmount(val);
                    }}
                    placeholder="Enter tip amount"
                    disabled={isSaving}
                    className="w-full pl-7 pr-3 py-2 text-sm font-semibold bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>

                {/* Quick Tip Chips */}
                <div className="flex items-center gap-2">
                  {[20, 50, 100, 200].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setTipAmount(String(chip))}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${
                        tipAmount === String(chip)
                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      +₹{chip}
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-gray-500">
                  Tip is recorded separately and not added to the bill total.
                </p>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 text-center leading-relaxed">
            Clicking <b>Save</b> records payment, marks this order completed, ends session, and frees the table.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 transition active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || selectedMethods.length === 0}
            className="flex-[2] py-3 px-4 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition shadow-lg shadow-green-600/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>
                  Save
                  {parsedTipValue > 0
                    ? ` (₹${totalAmount.toLocaleString()} + Tip ₹${parsedTipValue.toLocaleString()})`
                    : ` (₹${totalAmount.toLocaleString()})`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
