import { useState, useEffect } from "react";
import { X, CreditCard, Banknote, QrCode, UtensilsCrossed, CheckCircle2, Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  order: any;
  onClose: () => void;
  onSavePayment: (order: any, paymentMethod: string) => Promise<void>;
};

const PAYMENT_METHODS = [
  {
    id: "Cash",
    label: "Cash",
    icon: Banknote,
    color: "emerald",
    bgClass: "hover:border-emerald-500 hover:bg-emerald-50/60",
    selectedClass: "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20 text-emerald-900",
    iconColor: "text-emerald-600",
  },
  {
    id: "UPI",
    label: "UPI",
    icon: QrCode,
    color: "purple",
    bgClass: "hover:border-purple-500 hover:bg-purple-50/60",
    selectedClass: "border-purple-600 bg-purple-50 ring-2 ring-purple-500/20 text-purple-900",
    iconColor: "text-purple-600",
  },
  {
    id: "Card",
    label: "Card",
    icon: CreditCard,
    color: "blue",
    bgClass: "hover:border-blue-500 hover:bg-blue-50/60",
    selectedClass: "border-blue-600 bg-blue-50 ring-2 ring-blue-500/20 text-blue-900",
    iconColor: "text-blue-600",
  },
  {
    id: "Zomato",
    label: "Zomato",
    icon: UtensilsCrossed,
    color: "red",
    bgClass: "hover:border-red-500 hover:bg-red-50/60",
    selectedClass: "border-red-600 bg-red-50 ring-2 ring-red-500/20 text-red-900",
    iconColor: "text-red-600",
  },
];

export default function PaymentModal({
  open,
  order,
  onClose,
  onSavePayment,
}: Props) {
  const [selectedMethod, setSelectedMethod] = useState<string>("Cash");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (order) {
      setSelectedMethod(order.paymentMethod || "Cash");
      setIsSaving(false);
    }
  }, [order, open]);

  if (!open || !order) return null;

  const totalAmount = Number(order.finalTotal ?? order.total) || 0;
  const originalTotal = Number(order.total) || 0;
  const hasDiscount = Boolean(order.discountAmount && order.discountAmount > 0);
  const itemCount = (order.items || []).reduce((acc: number, item: any) => acc + (Number(item.quantity) || 1), 0);
  const tableDisplay = order.tableLabel || order.tableReference || `Table ${order.tableNumber || "--"}`;

  async function handleSave() {
    if (!selectedMethod) {
      alert("Please select a payment method.");
      return;
    }

    setIsSaving(true);
    try {
      await onSavePayment(order, selectedMethod);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unable to complete payment.");
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-olive">Payment & End Session</span>
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

        <div className="p-6 space-y-6">
          {/* Bill Total Banner */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/80 rounded-2xl p-5 text-center">
            <span className="text-xs font-medium text-amber-800 uppercase tracking-wider">
              Total Payable ({itemCount} {itemCount === 1 ? "item" : "items"})
            </span>
            <div className="text-4xl font-extrabold text-amber-950 mt-1">
              ₹{totalAmount.toLocaleString()}
            </div>
            {hasDiscount && (
              <div className="text-xs text-amber-700 mt-1.5 font-medium">
                <span className="line-through text-gray-400 mr-2">₹{originalTotal.toLocaleString()}</span>
                <span>(Saved ₹{Number(order.discountAmount).toLocaleString()})</span>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id)}
                    disabled={isSaving}
                    className={`
                      relative flex items-center gap-3 p-4 rounded-2xl border-2 font-semibold text-sm transition-all
                      ${isSelected ? method.selectedClass : `border-gray-200 bg-white text-gray-700 ${method.bgClass}`}
                      active:scale-95 disabled:opacity-50
                    `}
                  >
                    <div className={`p-2 rounded-xl ${isSelected ? "bg-white shadow-sm" : "bg-gray-100"}`}>
                      <Icon size={20} className={method.iconColor} />
                    </div>
                    <span>{method.label}</span>
                    {isSelected && (
                      <CheckCircle2 size={18} className={`ml-auto ${method.iconColor}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center leading-relaxed">
            Clicking <b>Save</b> will record payment in Excel reports, mark this order completed, end the session, and free the table.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-3.5 px-4 rounded-xl font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 transition active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !selectedMethod}
            className="flex-[2] py-3.5 px-4 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition shadow-lg shadow-green-600/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
