import { useState, useEffect, useMemo } from "react";
import OrderTimeline from "./OrderTimeline";
import {
  X,
  Receipt,
  Clock,
  Hash,
  ShoppingBag,
  Percent,
  FileText,
  CheckCircle2,
  Coins,
} from "lucide-react";
import { updateOrder, updateOrderDiscount, cancelOrder, updateOrderSplits, getOrderSplits } from "../services/orderService";
import { listenTables, freeTable } from "../services/tableApi";
import { printBill, printKOT, retryPrint } from "../services/printerService";
import { getKotSections } from "../../services/settingsService";
import type { PrintJob } from "../../services/printApi";
import DiscountModal from "../../components/DiscountModal";
import SplitBillModal from "../../components/SplitBillModal";
import EditItemPricesModal from "../../components/EditItemPricesModal";
import AddItemModal from "./AddItemModal";
import RemoveItemModal from "./RemoveItemModal";
import { splitItemsByCategory, type DiscountPayload } from "../../utils/discountUtils";
import { buildPreviewTexts, openReceiptPreview } from "../../utils/receiptPreview";
import { updateOrderItemPrices } from "../services/orderApi";

import StatusBadge from "./StatusBadge";

type Props = {
  open: boolean;
  order: any;
  onClose: () => void;
  onOrderCancelled?: (orderId: string) => void;
};

export default function OrderDetailsDrawer({
  open,
  order,
  onClose,
  onOrderCancelled,
}: Props) {
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [savingTable, setSavingTable] = useState(false);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>(["Cash"]);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({ Cash: "" });
  const [showTip, setShowTip] = useState(false);
  const [tipAmount, setTipAmount] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [billState, setBillState] = useState<{ printing: boolean; result: "success" | "failed" | null; message?: string }>({ printing: false, result: null });
  const [kotState, setKotState] = useState<{ printing: boolean; result: "success" | "failed" | null; message?: string }>({ printing: false, result: null });
  const [lastJobId, setLastJobId] = useState<{ BILL?: string; KOT?: string }>({});
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isRemoveItemOpen, setIsRemoveItemOpen] = useState(false);
  const [isSplitBillOpen, setIsSplitBillOpen] = useState(false);
  const [isEditPricesOpen, setIsEditPricesOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [previewContent, setPreviewContent] = useState<{ type: "BILL" | "KOT", text: string } | null>(null);
  const [, forceUpdate] = useState(0);

  const areas = useMemo(() => [...new Set(tables.map((table) => table.area))], [tables]);
  const selectedTable = tables.find((table) => table.id === selectedTableId);

  useEffect(() => {
    if (order) {
      const splits = order.paymentSplits
        ? typeof order.paymentSplits === "string"
          ? JSON.parse(order.paymentSplits)
          : order.paymentSplits
        : null;

      if (splits && Object.keys(splits).length > 0) {
        const active = Object.keys(splits).filter((k) => Number(splits[k]) > 0);
        setSelectedPaymentMethods(active.length > 0 ? active : [order.paymentMethod || "Cash"]);
        const loaded: Record<string, string> = {};
        for (const k of active) {
          loaded[k] = String(splits[k]);
        }
        setPaymentAmounts(loaded);
      } else {
        const initial = order.paymentMethod || "Cash";
        setSelectedPaymentMethods([initial]);
        setPaymentAmounts({ [initial]: "" });
      }

      const initialTip = Number(order.tipAmount || order.tip || 0);
      if (initialTip > 0) {
        setShowTip(true);
        setTipAmount(String(initialTip));
      } else {
        setShowTip(false);
        setTipAmount("");
      }
    }
  }, [order]);

  useEffect(() => {
    if (!open) return;
    return listenTables(setTables);
  }, [open]);

  useEffect(() => {
    if (order && tables.length > 0) {
      setSelectedTableId(order.tableId || tables.find((table) => table.tableKey === order.tableReference)?.id || "");
    }
  }, [order, tables]);

  if (!open || !order) return null;

  const totalPayable = Number(order.finalTotal ?? order.total) || 0;

  function togglePaymentMethod(method: string) {
    if (selectedPaymentMethods.includes(method)) {
      if (selectedPaymentMethods.length === 1) {
        setSelectedPaymentMethods([]);
        setPaymentAmounts((prev) => {
          const next = { ...prev };
          delete next[method];
          return next;
        });
      } else {
        setSelectedPaymentMethods((prev) => prev.filter((m) => m !== method));
        setPaymentAmounts((prev) => {
          const next = { ...prev };
          delete next[method];
          return next;
        });
      }
    } else {
      setSelectedPaymentMethods((prev) => [...prev, method]);
      setPaymentAmounts((prev) => ({ ...prev, [method]: prev[method] || "" }));
    }
  }

  function handlePaymentAmountChange(method: string, val: string) {
    if (val !== "" && !/^\d*\.?\d*$/.test(val)) return;
    setPaymentAmounts((prev) => ({ ...prev, [method]: val }));
  }

  const enteredPaymentSum = selectedPaymentMethods.reduce((acc, m) => {
    const val = parseFloat(paymentAmounts[m] || "0");
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const remainingPayable = Math.round((totalPayable - enteredPaymentSum) * 100) / 100;

  function handleFillPaymentRemaining(method: string) {
    const otherSum = selectedPaymentMethods
      .filter((m) => m !== method)
      .reduce((acc, m) => acc + (parseFloat(paymentAmounts[m] || "0") || 0), 0);
    const toFill = Math.max(0, Math.round((totalPayable - otherSum) * 100) / 100);
    setPaymentAmounts((prev) => ({
      ...prev,
      [method]: String(toFill),
    }));
  }

  async function handleSaveTable() {
    if (!selectedTable || selectedTable.id === order.tableId) return;
    setSavingTable(true);
    try {
      await updateOrder(order.id, { tableId: selectedTable.id });
      order.tableId = selectedTable.id;
      order.tableReference = selectedTable.tableKey;
      order.tableNumber = selectedTable.tableNumber;
      order.tableArea = selectedTable.area;
      order.tableLabel = selectedTable.displayName;
      alert("Table updated successfully.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unable to update table.");
    } finally {
      setSavingTable(false);
    }
  }

  async function handleSavePayment() {
    if (selectedPaymentMethods.length === 0) {
      alert("Please select at least one payment method.");
      return;
    }

    const finalSplits: Record<string, number> = {};
    let finalMethod = "";

    if (selectedPaymentMethods.length === 1) {
      const single = selectedPaymentMethods[0];
      const entered = parseFloat(paymentAmounts[single] || "");
      if (isNaN(entered) || entered <= 0) {
        finalSplits[single] = totalPayable;
      } else {
        finalSplits[single] = entered;
      }
      finalMethod = single;
    } else {
      const emptyMethods = selectedPaymentMethods.filter(
        (m) => !paymentAmounts[m] || parseFloat(paymentAmounts[m]) <= 0
      );

      const workingAmounts = { ...paymentAmounts };

      if (emptyMethods.length === 1) {
        const sumFilled = selectedPaymentMethods
          .filter((m) => m !== emptyMethods[0])
          .reduce((acc, m) => acc + (parseFloat(paymentAmounts[m] || "0") || 0), 0);
        if (sumFilled < totalPayable) {
          workingAmounts[emptyMethods[0]] = String(
            Math.round((totalPayable - sumFilled) * 100) / 100
          );
        }
      }

      let multiSum = 0;
      for (const m of selectedPaymentMethods) {
        const amt = parseFloat(workingAmounts[m] || "0") || 0;
        finalSplits[m] = amt;
        multiSum += amt;
      }

      multiSum = Math.round(multiSum * 100) / 100;
      if (Math.abs(multiSum - totalPayable) > 0.01) {
        alert(
          `Total of entered amounts (₹${multiSum}) does not match the payable bill amount (₹${totalPayable}). Please adjust the amounts.`
        );
        return;
      }

      finalMethod = `Split (${selectedPaymentMethods
        .map((m) => `${m}: ₹${finalSplits[m]}`)
        .join(", ")})`;
    }

    const parsedTip = showTip ? parseFloat(tipAmount) || 0 : 0;

    setSavingPayment(true);
    try {
      await updateOrder(order.id, {
        paymentMethod: finalMethod,
        paymentSplits: finalSplits,
        tipAmount: parsedTip,
        paymentStatus: 'Paid',
        status: 'Completed',
        completedAt: new Date().toISOString()
      });
      order.status = 'Completed';
      order.paymentMethod = finalMethod;
      order.paymentSplits = finalSplits;
      order.tipAmount = parsedTip;
      order.paymentStatus = 'Paid';

      const targetTableId = order.tableId || tables.find((t: any) => t.tableKey === order.tableReference || t.id === order.tableReference)?.id;
      if (targetTableId) {
        await freeTable(targetTableId);
      }

      alert("Payment saved, Order Completed, and Table Freed.");
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unable to save payment method.");
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleAddedItems(updated: any) {
    Object.assign(order, updated);
    forceUpdate((n) => n + 1);
  }

  async function handleRemovedItems(updated: any) {
    Object.assign(order, updated);
    forceUpdate((n) => n + 1);
  }

  async function handleCancelOrder() {
    const ok = window.confirm(`Cancel Order #${order.orderNumber}? This cannot be undone.`);
    if (!ok) return;
    setIsCancelling(true);
    try {
      await cancelOrder(order.id);
      onOrderCancelled?.(order.id);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unable to cancel order.");
    } finally {
      setIsCancelling(false);
    }
  }

  const created =
    order.createdAt?.toDate?.() || new Date();

  const total = order.total;

  async function handleSaveDiscount(payload: DiscountPayload) {
    await updateOrderDiscount(order.id, payload);
    Object.assign(order, payload);
  }

  async function handleSavePrices(updates: { id: string; newPrice: number }[]) {
    const updatedOrder = await updateOrderItemPrices(order.id, updates);
    Object.assign(order, updatedOrder);
    forceUpdate((n) => n + 1);
  }

  async function handleSaveSplit(splits: any[]) {
    await updateOrderSplits(order.id, splits);
  }

  // Print Bill / Print KOT: both go through the exact same backend job
  // queue + restaurant print connector that the waiter dashboard uses.
  // There is no fallback path -- if the connector can't reach the printer,
  // the status here says so honestly (with Retry), it never silently opens
  // a browser print dialog instead.
  async function handlePrintBill() {
    if (previewContent?.type !== "BILL") {
      let splits = [];
      try {
        splits = await getOrderSplits(order.id);
      } catch (err) { }

      const texts = buildPreviewTexts(order, "BILL", { splits });
      setPreviewContent({ type: "BILL", text: texts.map((t) => t.text).join("\n\n==========================================\n\n") });
      return;
    }
    setPreviewContent(null);
    setBillState({ printing: true, result: null });
    const outcome = await printBill(order.id);
    if (outcome.job) setLastJobId((current) => ({ ...current, BILL: (outcome.job as PrintJob).id }));
    setBillState({ printing: false, result: outcome.ok ? "success" : "failed", message: outcome.message });
  }

  async function handlePrintKOT() {
    if (previewContent?.type !== "KOT") {
      let kotSections = {};
      try {
        kotSections = await getKotSections();
      } catch (err) { }

      const texts = buildPreviewTexts(order, "KOT", { kotSections });
      setPreviewContent({ type: "KOT", text: texts.map((t) => t.text).join("\n\n==========================================\n\n") });
      return;
    }
    setPreviewContent(null);
    setKotState({ printing: true, result: null });
    const outcome = await printKOT(order.id);
    if (outcome.job) setLastJobId((current) => ({ ...current, KOT: (outcome.job as PrintJob).id }));
    setKotState({ printing: false, result: outcome.ok ? "success" : "failed", message: outcome.message });
  }

  async function handleRetryBill() {
    if (!lastJobId.BILL) return handlePrintBill();
    setBillState({ printing: true, result: null });
    const outcome = await retryPrint(lastJobId.BILL, "BILL");
    setBillState({ printing: false, result: outcome.ok ? "success" : "failed", message: outcome.message });
  }

  async function handleRetryKOT() {
    if (!lastJobId.KOT) return handlePrintKOT();
    setKotState({ printing: true, result: null });
    const outcome = await retryPrint(lastJobId.KOT, "KOT");
    setKotState({ printing: false, result: outcome.ok ? "success" : "failed", message: outcome.message });
  }

  const hasDiscount = Boolean(order.discountAmount && order.discountAmount > 0);
  const isCategoryDiscount = order.discountMode === "category";
  const { foodTotal: billFoodTotal, alcoholTotal: billAlcoholTotal } = splitItemsByCategory(order.items);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">

      <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl">

        {/* Header */}

        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-start">

          <div>

            <h2 className="text-2xl font-bold">
              Order #{order.orderNumber}
            </h2>

            <p className="text-gray-500 mt-1">
              {order.tableLabel || order.tableReference || `Table ${order.tableNumber || "--"}`}
            </p>

          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X />
          </button>

        </div>

        <div className="px-6 pt-6">
          <button
            type="button"
            onClick={handleCancelOrder}
            disabled={isCancelling}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-60"
          >
            {isCancelling ? "Cancelling..." : "Cancel Order"}
          </button>
        </div>

        <div className="p-6 space-y-8">

          {/* Customer Details */}

          <div className="border rounded-2xl p-5">
            <h3 className="font-semibold mb-4">
              Customer Details
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Name</span>
                <p className="font-medium">{order.customerName || ""}</p>
              </div>
              <div>
                <span className="text-gray-500">Phone</span>
                <p className="font-medium">{order.customerPhone || ""}</p>
              </div>
            </div>
          </div>

          {/* Status */}

          <div>

            <h3 className="font-semibold mb-3">
              Current Status
            </h3>

            <StatusBadge status={order.status} />

            <div className="mt-4">
              <span className="text-sm font-medium">
                Payment Method:
              </span>

              <span
                className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${order.paymentMethod === "UPI"
                  ? "bg-green-100 text-green-700"
                  : order.paymentMethod === "Card"
                    ? "bg-blue-100 text-blue-700"
                    : order.paymentMethod === "Cash"
                      ? "bg-orange-100 text-orange-700"
                      : order.paymentMethod === "Zomato"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                  }`}
              >
                {order.paymentMethod || "Not Paid"}
              </span>

            </div>

          </div>

          {/* Items */}

          <div>

            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <ShoppingBag size={18} />
              Ordered Items
            </h3>

            <div className="space-y-3">

              {order.items?.map(
                (item: any, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between border rounded-xl p-4"
                  >
                    <div>

                      <p className="font-semibold">
                        {item.name}
                      </p>

                      <p className="text-sm text-gray-500">
                        Qty : {item.quantity}
                      </p>

                    </div>

                    <p className="font-semibold">
                      ₹
                      {item.price * item.quantity}
                    </p>

                  </div>
                )
              )}

            </div>

            {order.description && String(order.description).trim() && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs flex items-start gap-2 text-amber-900">
                <FileText size={16} className="shrink-0 text-amber-700 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-800">Kitchen Note: </span>
                  <span className="font-medium text-amber-900">{order.description}</span>
                </div>
              </div>
            )}

          </div>

          {/* Bill Summary */}

          <div className="border rounded-2xl p-5">

            <h3 className="font-semibold flex items-center gap-2 mb-5">

              <Receipt size={18} />

              Bill Summary

            </h3>

            <div className="space-y-3">

              {isCategoryDiscount ? (
                <>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Food Total</span>
                    <span>₹{billFoodTotal}</span>
                  </div>
                  {order.foodDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm text-red-600 font-semibold">
                      <span>Food Discount ({order.foodDiscountPercent}%)</span>
                      <span>-₹{order.foodDiscountAmount}</span>
                    </div>
                  )}
                  {billAlcoholTotal > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Liquor Total</span>
                      <span>₹{billAlcoholTotal}</span>
                    </div>
                  )}
                  {order.alcoholDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm text-red-600 font-semibold">
                      <span>Liquor Discount ({order.alcoholDiscountPercent}%)</span>
                      <span>-₹{order.alcoholDiscountAmount}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Food Total</span>
                  <span>₹{total}</span>
                </div>
              )}

              {!isCategoryDiscount && hasDiscount && (
                <div className="flex justify-between text-sm text-red-600 font-semibold animate-in fade-in slide-in-from-top-1 duration-200">
                  <span>
                    Discount ({order.discountType === 'percent' ? `${order.discountValue}%` : `₹${order.discountValue}`})
                  </span>
                  <span>-₹{order.discountAmount}</span>
                </div>
              )}

              <hr />

              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>Grand Total</span>
                <span>₹{hasDiscount ? order.finalTotal : total}</span>
              </div>

            </div>

          </div>

          <div className="border rounded-2xl p-5">

            <OrderTimeline
              currentStatus={order.status}
            />

          </div>

          {/* Order Info */}

          <div className="border rounded-2xl p-5">

            <h3 className="font-semibold mb-4">
              Table Information
            </h3>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-600">
                Area
                <select
                  value={selectedTable?.area || ""}
                  onChange={(event) => {
                    const firstTable = tables.find((table) => table.area === event.target.value);
                    setSelectedTableId(firstTable?.id || "");
                  }}
                  className="mt-1 w-full border rounded-xl px-3 py-2 font-normal text-gray-900"
                >
                  <option value="">Select area</option>
                  {areas.map((area) => <option key={area} value={area}>{tables.find((table) => table.area === area)?.areaLabel || area}</option>)}
                </select>
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Table Number
                <select
                  value={selectedTableId}
                  onChange={(event) => setSelectedTableId(event.target.value)}
                  className="mt-1 w-full border rounded-xl px-3 py-2 font-normal text-gray-900"
                >
                  <option value="">Select table</option>
                  {tables.filter((table) => !selectedTable?.area || table.area === selectedTable.area).map((table) => <option key={table.id} value={table.id}>{table.tableNumber}</option>)}
                </select>
              </label>

              <button
                type="button"
                onClick={handleSaveTable}
                disabled={!selectedTable || selectedTable.id === order.tableId || savingTable}
                className="w-full bg-olive text-white py-2.5 rounded-xl font-semibold disabled:opacity-50"
              >
                {savingTable ? "Updating..." : "Update Table"}
              </button>
            </div>

          </div>

          <div className="border rounded-2xl p-5">

            <h3 className="font-semibold mb-5">
              Order Information
            </h3>

            <div className="space-y-4">

              <div className="flex items-center gap-3">

                <Clock size={18} />

                <div>

                  <p className="text-sm text-gray-500">
                    Created
                  </p>

                  <p className="font-medium">
                    {created.toLocaleString()}
                  </p>

                </div>

              </div>

              <div className="flex items-center gap-3">

                <Hash size={18} />

                <div>

                  <p className="text-sm text-gray-500">
                    Session ID
                  </p>

                  <p className="font-medium break-all">
                    {order.sessionId}
                  </p>

                </div>

              </div>

            </div>

          </div>

          {/* Discount + Print + Close (Discount sits above the Print button) */}

          <div className="space-y-3">

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsAddItemOpen(true)}
                className="w-full border border-gray-300 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
              >
                + Add Item
              </button>
              <button
                type="button"
                onClick={() => setIsRemoveItemOpen(true)}
                className="w-full border border-red-300 text-red-600 py-3 rounded-xl font-semibold hover:bg-red-50 transition"
              >
                − Remove Item
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(true)}
                className="w-full border border-gray-300 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-1.5 text-sm sm:text-base"
              >
                <Percent size={17} />
                {hasDiscount ? "Edit Discount" : "Discount"}
              </button>
              <button
                type="button"
                onClick={() => setIsSplitBillOpen(true)}
                className="w-full border border-blue-300 text-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-50 transition text-sm sm:text-base"
              >
                Split Bill
              </button>
              <button
                type="button"
                onClick={() => setIsEditPricesOpen(true)}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition col-span-2 lg:col-span-1 text-sm sm:text-base"
              >
                Edit Prices
              </button>
            </div>

            {previewContent && (
              <div className="bg-gray-50 border p-4 rounded-xl max-h-64 overflow-y-auto w-full">
                <pre className={`font-mono text-gray-800 whitespace-pre ${previewContent.type === "KOT" ? "text-sm" : "text-xs"}`}>
                  {previewContent.text}
                </pre>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">

              <div className="flex-1 flex flex-col gap-1">
                <button
                  onClick={handlePrintBill}
                  disabled={billState.printing}
                  className={`w-full text-white py-3 rounded-xl font-semibold transition ${billState.printing ? "bg-olive/70 cursor-wait" : previewContent?.type === "BILL" ? "bg-green-600 hover:bg-green-700" : "bg-olive hover:bg-olive/90"
                    }`}
                >
                  {billState.printing ? "Printing Bill..." : previewContent?.type === "BILL" ? "Confirm Print Bill" : "Print Bill"}
                </button>
                {(billState.printing || billState.result) && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className={billState.result === "failed" ? "text-red-600 font-medium" : billState.result === "success" ? "text-green-600 font-medium" : "text-gray-500"}>
                      {billState.printing ? "Sending bill to printer..." : billState.message}
                    </span>
                    {billState.result === "failed" && (
                      <button onClick={handleRetryBill} className="underline text-gray-700 hover:text-gray-900">
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-1">
                <button
                  onClick={handlePrintKOT}
                  disabled={kotState.printing}
                  className={`w-full text-white py-3 rounded-xl font-semibold transition ${kotState.printing ? "bg-olive/70 cursor-wait" : previewContent?.type === "KOT" ? "bg-green-600 hover:bg-green-700" : "bg-olive hover:bg-olive/90"
                    }`}
                >
                  {kotState.printing ? "Printing KOT..." : previewContent?.type === "KOT" ? "Confirm Print KOT" : "Print KOT"}
                </button>
                {(kotState.printing || kotState.result) && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className={kotState.result === "failed" ? "text-red-600 font-medium" : kotState.result === "success" ? "text-green-600 font-medium" : "text-gray-500"}>
                      {kotState.printing ? "Sending kot to printer..." : kotState.message}
                    </span>
                    {kotState.result === "failed" && (
                      <button onClick={handleRetryKOT} className="underline text-gray-700 hover:text-gray-900">
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={onClose}
                className="sm:flex-none border py-3 px-6 rounded-xl font-semibold hover:bg-gray-50 transition"
              >
                Close
              </button>

            </div>

          </div>

          {/* Payment Method + Save (persists paymentMethod, splits, and tip on the order) */}
          <div className="border rounded-2xl p-5 space-y-4">

            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Payment Method
              </h3>
              {selectedPaymentMethods.length > 1 && (
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Split Payment Active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Select one or multiple options. Enter amounts for split payments. If a single option is selected without entering an amount, it will contain the full total.
            </p>

            <div className="space-y-2.5">
              {["Cash", "Card", "UPI", "Zomato"].map((method) => {
                const isSelected = selectedPaymentMethods.includes(method);
                return (
                  <div
                    key={method}
                    className={`rounded-xl border-2 transition-all p-3 ${
                      isSelected
                        ? "border-olive bg-olive/5 text-gray-900 ring-1 ring-olive/20"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      onClick={() => !savingPayment && togglePaymentMethod(method)}
                      className="flex items-center justify-between cursor-pointer select-none"
                    >
                      <span className="font-semibold text-sm">{method}</span>
                      {isSelected ? (
                        <CheckCircle2 size={18} className="text-olive" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                      )}
                    </div>

                    {/* Amount Input Box (Appears when clicked/selected) */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-gray-200/70 flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">
                            ₹
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={paymentAmounts[method] ?? ""}
                            onChange={(e) => handlePaymentAmountChange(method, e.target.value)}
                            placeholder={
                              selectedPaymentMethods.length === 1
                                ? `Default: ₹${totalPayable}`
                                : "Enter amount"
                            }
                            disabled={savingPayment}
                            className="w-full pl-7 pr-3 py-2 text-sm font-semibold bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-olive/40 focus:border-olive"
                          />
                        </div>

                        {selectedPaymentMethods.length > 1 && remainingPayable > 0 && (
                          <button
                            type="button"
                            onClick={() => handleFillPaymentRemaining(method)}
                            className="text-xs px-2.5 py-2 font-medium bg-white hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-300 shrink-0 transition"
                          >
                            Fill ₹{remainingPayable}
                          </button>
                        )}
                        {selectedPaymentMethods.length === 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setPaymentAmounts({ [method]: String(totalPayable) })
                            }
                            className="text-xs px-2.5 py-2 font-medium bg-white hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-300 shrink-0 transition"
                          >
                            Full ₹{totalPayable}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Split Balance Summary Indicator */}
            {selectedPaymentMethods.length > 1 && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between font-medium ${
                  Math.abs(remainingPayable) < 0.01
                    ? "bg-green-50 border-green-200 text-green-800"
                    : remainingPayable > 0
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                <span>
                  Entered: ₹{enteredPaymentSum.toLocaleString()} / ₹{totalPayable.toLocaleString()}
                </span>
                <span>
                  {Math.abs(remainingPayable) < 0.01
                    ? "✓ Exact Total Allocated"
                    : remainingPayable > 0
                    ? `₹${remainingPayable.toLocaleString()} remaining`
                    : `₹${Math.abs(remainingPayable).toLocaleString()} over total`}
                </span>
              </div>
            )}

            {/* Tip Option */}
            <div className="border border-gray-200 rounded-2xl p-3.5 bg-gray-50/70">
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
                <div className="mt-3 pt-3 border-t border-gray-200/80 space-y-2.5">
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
                      disabled={savingPayment}
                      className="w-full pl-7 pr-3 py-2 text-sm font-semibold bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                    />
                  </div>

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

            <button
              type="button"
              onClick={handleSavePayment}
              disabled={savingPayment || selectedPaymentMethods.length === 0}
              className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl font-semibold disabled:opacity-60 transition"
            >
              {savingPayment
                ? "Saving..."
                : showTip && parseFloat(tipAmount) > 0
                ? `Save Payment (₹${totalPayable.toLocaleString()} + Tip ₹${parseFloat(tipAmount).toLocaleString()})`
                : `Save Payment (₹${totalPayable.toLocaleString()})`}
            </button>

          </div>

        </div>

      </div>

      <DiscountModal
        open={isDiscountModalOpen}
        order={order}
        onClose={() => setIsDiscountModalOpen(false)}
        onSave={handleSaveDiscount}
      />

      <AddItemModal
        open={isAddItemOpen}
        order={order}
        onClose={() => setIsAddItemOpen(false)}
        onItemAdded={handleAddedItems}
      />

      <RemoveItemModal
        open={isRemoveItemOpen}
        order={order}
        onClose={() => setIsRemoveItemOpen(false)}
        onItemsRemoved={handleRemovedItems}
      />

      <SplitBillModal
        open={isSplitBillOpen}
        order={order}
        onClose={() => setIsSplitBillOpen(false)}
        onSave={handleSaveSplit}
      />

      <EditItemPricesModal
        open={isEditPricesOpen}
        order={order}
        onClose={() => setIsEditPricesOpen(false)}
        onSave={handleSavePrices}
      />

    </div>
  );
}
