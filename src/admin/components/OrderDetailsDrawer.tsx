import { useState, useEffect, useMemo } from "react";
import OrderTimeline from "./OrderTimeline";
import {
  X,
  Receipt,
  Clock,
  Hash,
  ShoppingBag,
  Percent,
} from "lucide-react";
import { updateOrder, updateOrderDiscount, cancelOrder, updateOrderSplits, getOrderSplits } from "../services/orderService";
import { listenTables } from "../services/tableApi";
import { printBill, printKOT, retryPrint } from "../services/printerService";
import { getKotSections } from "../../services/settingsService";
import type { PrintJob } from "../../services/printApi";
import DiscountModal from "../../components/DiscountModal";
import SplitBillModal from "../../components/SplitBillModal";
import EditItemPricesModal from "../../components/EditItemPricesModal";
import AddItemModal from "./AddItemModal";
import RemoveItemModal from "./RemoveItemModal";
import { splitItemsByCategory, type DiscountPayload } from "../../utils/discountUtils";
import { buildPreviewTexts } from "../../utils/receiptPreview";
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
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
      setSelectedPaymentMethod(order.paymentMethod || "");
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
    if (!selectedPaymentMethod) {
      alert("Please select a payment method.");
      return;
    }
    setSavingPayment(true);
    try {
      await updateOrder(order.id, { paymentMethod: selectedPaymentMethod });
      order.paymentMethod = selectedPaymentMethod;
      alert("Payment method saved.");
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

            <h3 className="font-semibold mb-4 flex items-center justify-between gap-2">

              <span className="flex items-center gap-2">
                <ShoppingBag size={18} />
                Ordered Items
              </span>

              <div className="flex flex-col flex-wrap justify-end gap-2">
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddItemOpen(true)}
                    className="text-sm font-semibold text-olive border border-olive rounded-lg px-3 py-1.5 hover:bg-olive/5 transition"
                  >
                    + Add Item
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRemoveItemOpen(true)}
                    className="text-sm font-semibold text-red-600 border border-red-600 rounded-lg px-3 py-1.5 hover:bg-red-50 transition"
                  >
                    − Remove Item
                  </button>
                </span>
                <span className="flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => setIsEditPricesOpen(true)}
                    className="flex-1 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition"
                  >
                    Edit Prices
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSplitBillOpen(true)}
                    className="flex-1 text-sm font-semibold text-blue-600 border border-blue-600 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition"
                  >
                    Split Bill
                  </button>
                </span>
              </div>

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

            <button
              type="button"
              onClick={() => setIsDiscountModalOpen(true)}
              className="w-full border border-olive text-olive py-3 rounded-xl font-semibold hover:bg-olive/5 transition flex items-center justify-center gap-2"
            >
              <Percent size={17} />
              {hasDiscount ? "Edit Discount" : "Apply Discount"}
            </button>

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

          {/* Payment Method + Save (persists paymentMethod on the order) */}
          <div className="border rounded-2xl p-5 space-y-4">

            <h3 className="font-semibold">
              Payment Method
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {["Card", "Cash", "UPI", "Zomato"].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setSelectedPaymentMethod(method)}
                  className={`py-3 rounded-xl font-semibold border transition ${selectedPaymentMethod === method
                    ? "bg-olive text-white border-olive"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                >
                  {method}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSavePayment}
              disabled={savingPayment}
              className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl font-semibold disabled:opacity-60"
            >
              {savingPayment ? "Saving..." : "Save"}
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
