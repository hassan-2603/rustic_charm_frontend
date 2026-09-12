import { Percent, FileText, UtensilsCrossed } from "lucide-react";

export type PrintButtonState = {
  /** true only while the job is genuinely in flight (PENDING/PROCESSING) */
  printing: boolean;
  /** null = no attempt yet or dismissed. Never says "printed" unless the connector confirmed it. */
  result: "success" | "failed" | null;
  message?: string;
};

interface Props {
  order: any;
  buttonText: string;
  onAction?: (order: any) => void;
  onReject?: (order: any) => void;
  onPrintBill?: (order: any) => void;
  onPrintKOT?: (order: any) => void;
  onRetryBill?: (order: any) => void;
  onRetryKOT?: (order: any) => void;
  onPreview?: (order: any, type: "BILL" | "KOT") => void;
  billState?: PrintButtonState;
  kotState?: PrintButtonState;
  onSplit?: (order: any) => void;
  onEditPrices?: (order: any) => void;
  onDiscount?: (order: any) => void;
  onChangeTable?: (order: any) => void;
  onAddItem?: (order: any) => void;
  onRemoveItem?: (order: any) => void;
  onCancel?: (order: any) => void;
}

function PrintControl({
  label,
  state,
  onPrint,
  onRetry,
  onPreview,
}: {
  label: string;
  state?: PrintButtonState;
  onPrint: () => void;
  onRetry?: () => void;
  onPreview?: () => void;
}) {
  const printing = !!state?.printing;
  const failed = state?.result === "failed";
  const succeeded = state?.result === "success";

  return (
    <div className="flex flex-col items-stretch sm:items-end gap-1">
      <button
        onClick={onPrint}
        disabled={printing}
        className={`px-5 py-2 rounded-xl font-semibold border transition ${printing
          ? "bg-gray-100 text-gray-400 cursor-wait"
          : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
          }`}
      >
        {printing ? `Printing ${label}...` : `🖨️ Print ${label}`}
      </button>
      {(printing || failed || succeeded) && (
        <div className="flex items-center gap-2 text-xs">
          <span className={failed ? "text-red-600 font-medium" : succeeded ? "text-green-600 font-medium" : "text-gray-500"}>
            {printing ? `Sending ${label.toLowerCase()} to printer...` : state?.message}
          </span>
          {failed && onRetry && (
            <button onClick={onRetry} className="underline text-gray-700 hover:text-gray-900">
              Retry
            </button>
          )}
          {failed && onPreview && (
            <button onClick={onPreview} className="underline text-gray-700 hover:text-gray-900">
              Preview
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrderCard({
  order,
  buttonText,
  onAction,
  onReject,
  onPrintBill,
  onPrintKOT,
  onRetryBill,
  onRetryKOT,
  onPreview,
  billState,
  kotState,
  onSplit,
  onEditPrices,
  onDiscount,
  onChangeTable,
  onAddItem,
  onRemoveItem,
  onCancel,
}: Props) {
  const hasDiscount = Boolean(order.discountAmount && order.discountAmount > 0);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border">

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">

        <div>

          <h2 className="text-2xl font-bold">
            {order.tableLabel || order.tableReference || `Table ${order.tableNumber || "--"}`}
          </h2>

          <p className="text-gray-500">
            Order #{order.orderNumber}
          </p>

        </div>

        <span className="px-4 py-2 rounded-full bg-yellow-100 text-yellow-700 font-semibold">

          {order.status}

        </span>

      </div>

      <div className="mt-5 space-y-2">

        {(order.items || []).map((item: any, index: number) => (

          <div
            key={index}
            className="flex justify-between"
          >

            <span>

              {item.quantity} × {item.name}

            </span>

            <span>

              ₹{item.price * item.quantity}

            </span>

          </div>

        ))}

      </div>

      {order.description && String(order.description).trim() && (
        <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs flex items-start gap-2 text-amber-900">
          <FileText size={15} className="shrink-0 text-amber-700 mt-0.5" />
          <div>
            <span className="font-bold text-amber-800">Kitchen Note: </span>
            <span className="font-medium text-amber-900">{order.description}</span>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">

        <div>
          {hasDiscount ? (
            <div className="space-y-0.5">
              <p className="text-sm text-gray-500 line-through">₹{order.total}</p>
              <h3 className="text-xl font-bold text-gray-900">
                ₹{order.finalTotal}
                <span className="ml-2 text-xs font-semibold text-red-600 align-middle">
                  -₹{order.discountAmount} off
                </span>
              </h3>
            </div>
          ) : (
            <h3 className="text-xl font-bold">
              ₹{order.total}
            </h3>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {onReject && (
            <button
              onClick={() => onReject(order)}
              className="px-5 py-2 rounded-xl text-white font-semibold bg-red-600 hover:bg-red-700 transition"
            >
              Reject Order
            </button>
          )}


          {onSplit && (
            <button
              onClick={() => onSplit(order)}
              className="px-5 py-2 rounded-xl font-semibold border transition bg-white text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              Split Bill
            </button>
          )}

          {onEditPrices && (
            <button
              onClick={() => onEditPrices(order)}
              className="px-5 py-2 rounded-xl font-semibold border transition bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              Edit Prices
            </button>
          )}

          {onDiscount && (
            <button
              onClick={() => onDiscount(order)}
              className="px-5 py-2 rounded-xl font-semibold border transition bg-white text-gray-800 border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-1.5"
            >
              <Percent size={15} />
              {hasDiscount ? "Edit Discount" : "Discount"}
            </button>
          )}

          {onChangeTable && (
            <button
              onClick={() => onChangeTable(order)}
              className="px-5 py-2 rounded-xl font-semibold border transition bg-white text-gray-800 border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-1.5"
            >
              <UtensilsCrossed size={15} />
              Change Table
            </button>
          )}

          {onAddItem && (
            <button
              onClick={() => onAddItem(order)}
              className="px-5 py-2 rounded-xl font-semibold border transition bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
            >
              + Add Item
            </button>
          )}

          {onRemoveItem && (
            <button
              onClick={() => onRemoveItem(order)}
              className="px-5 py-2 rounded-xl font-semibold border transition bg-white text-red-600 border-red-300 hover:bg-red-50"
            >
              − Remove Item
            </button>
          )}

          {onCancel && (
            <button
              onClick={() => onCancel(order)}
              className="px-5 py-2 rounded-xl text-white font-semibold bg-red-600 hover:bg-red-700 transition"
            >
              Cancel
            </button>
          )}

          {onPrintKOT && (
            <PrintControl
              label="KOT"
              state={kotState}
              onPrint={() => onPrintKOT(order)}
              onRetry={onRetryKOT ? () => onRetryKOT(order) : undefined}
              onPreview={onPreview ? () => onPreview(order, "KOT") : undefined}
            />
          )}

          {onPrintBill && (
            <PrintControl
              label="Bill"
              state={billState}
              onPrint={() => onPrintBill(order)}
              onRetry={onRetryBill ? () => onRetryBill(order) : undefined}
              onPreview={onPreview ? () => onPreview(order, "BILL") : undefined}
            />
          )}

          <button
            disabled={!onAction}
            onClick={() => onAction?.(order)}
            className={`px-5 py-2 rounded-xl text-white font-semibold ${onAction
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-400 cursor-not-allowed"
              }`}
          >
            {buttonText}
          </button>
        </div>

      </div>

    </div>
  );
}
