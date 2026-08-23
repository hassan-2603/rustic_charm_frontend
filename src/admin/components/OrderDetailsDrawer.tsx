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
import { updateOrder, updateOrderDiscount } from "../services/orderService";
import { listenTables } from "../services/tableApi";
import { printBillThroughConnector } from "../services/printerService";

import StatusBadge from "./StatusBadge";

type Props = {
  open: boolean;
  order: any;
  onClose: () => void;
};

export default function OrderDetailsDrawer({
  open,
  order,
  onClose,
}: Props) {
  const [isDiscountFormOpen, setIsDiscountFormOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
  const [discountValue, setDiscountValue] = useState<string>("");
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [savingTable, setSavingTable] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const areas = useMemo(() => [...new Set(tables.map((table) => table.area))], [tables]);
  const selectedTable = tables.find((table) => table.id === selectedTableId);

  useEffect(() => {
    if (order) {
      setDiscountType(order.discountType || 'percent');
      setDiscountValue(order.discountValue !== undefined ? String(order.discountValue) : "");
      setIsDiscountFormOpen(!!order.discountAmount);
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

  const created =
    order.createdAt?.toDate?.() || new Date();

  const total = order.total;

  async function handleApplyDiscount() {
    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      alert("Please enter a valid discount amount/percentage.");
      return;
    }

    let calculatedDiscount = 0;
    const foodTotal = order.total;

    if (discountType === 'percent') {
      calculatedDiscount = Math.round((foodTotal * value) / 100);
    } else {
      calculatedDiscount = value;
    }

    if (calculatedDiscount > foodTotal) {
      alert("Discount cannot exceed the total amount.");
      return;
    }

    const finalTotal = Math.max(0, foodTotal - calculatedDiscount);

    try {
      await updateOrderDiscount(order.id, {
        discountType,
        discountValue: value,
        discountAmount: calculatedDiscount,
        finalTotal,
      });
      order.discountType = discountType;
      order.discountValue = value;
      order.discountAmount = calculatedDiscount;
      order.finalTotal = finalTotal;
      setIsDiscountFormOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to apply discount.");
    }
  }

  async function handleRemoveDiscount() {
    try {
      await updateOrderDiscount(order.id, {
        discountType: null as any,
        discountValue: null as any,
        discountAmount: null as any,
        finalTotal: null as any,
      });
      order.discountType = undefined;
      order.discountValue = undefined;
      order.discountAmount = undefined;
      order.finalTotal = undefined;
      setDiscountValue("");
      setIsDiscountFormOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to clear discount.");
    }
  }

  async function handlePrint() {
    setIsPrinting(true);
    try {
      try {
        await printBillThroughConnector(order);
        return;
      } catch (error) {
        console.warn("Print connector unavailable; opening browser print dialog.", error);
      }

    const itemsHtml = order.items
      ?.map(
        (item: any) => `
        <tr>
          <td>${item.name}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">₹${item.price * item.quantity}</td>
        </tr>
      `
      )
      .join("");

    const created =
      order.createdAt?.toDate?.() || new Date();

    const win = window.open("", "", "width=420,height=700");

    if (!win) return;

    const hasDiscount = order.discountAmount && order.discountAmount > 0;
    const discountSectionHtml = hasDiscount
      ? `
        <div style="text-align:right; margin-top:10px; font-size:16px;">
          Food Total: ₹${order.total}
        </div>
        <div style="text-align:right; margin-top:5px; font-size:16px; color:#b91c1c;">
          Discount (${order.discountType === 'percent' ? `${order.discountValue}%` : `₹${order.discountValue}`}): -₹${order.discountAmount}
        </div>
        <div class="total">
          Grand Total : ₹${order.finalTotal}
        </div>
      `
      : `
        <div class="total">
          Total : ₹${order.total}
        </div>
      `;

    win.document.write(`
    <html>

    <head>

      <title>Receipt</title>

      <style>

        body{
          font-family:Arial;
          padding:20px;
        }

        h2{
          text-align:center;
          font-weight:normal;
        }

        table{
          width:100%;
          border-collapse:collapse;
          margin-top:15px;
        }

        th,td{
          border-bottom:1px dashed #999;
          padding:8px;
          font-weight:normal;
        }

        .total{
          text-align:right;
          margin-top:20px;
          font-size:20px;
          font-weight:normal;
        }

      </style>

    </head>

    <body>

      <h2>RUSTIC CHARM</h2>

      <p style="text-align:center; margin:0;">RESTRO BAR AND CAFE BY DAAOM</p>

      <p>Order: ${order.orderNumber}</p>

      <p>Table: ${order.tableLabel || order.tableReference || `Table ${order.tableNumber || "--"}`}</p>

      <p>Customer Name: ${order.customerName || ""}</p>

      <p>Customer Phone: ${order.customerPhone || ""}</p>

      <p>Waiter: ${order.waiterName}</p>

      <p>Date: ${created.toLocaleString()}</p>

      <table>

        <thead>

          <tr>

            <th align="left">Item</th>

            <th>Qty</th>

            <th align="right">Amount</th>

          </tr>

        </thead>

        <tbody>

          ${itemsHtml}

        </tbody>

      </table>

      ${discountSectionHtml}

    </body>

    </html>
    `);

    win.document.close();

    setTimeout(() => {
      win.focus();
      win.print();
    }, 300);
    } finally {
      setIsPrinting(false);
    }
  }

  const hasDiscount = order.discountAmount && order.discountAmount > 0;

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
                className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  order.paymentMethod === "UPI"
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

          </div>

          {/* Bill Summary */}

          <div className="border rounded-2xl p-5">

            <h3 className="font-semibold flex items-center gap-2 mb-5">

              <Receipt size={18} />

              Bill Summary

            </h3>

            <div className="space-y-3">

              <div className="flex justify-between text-sm text-gray-600">
                <span>Food Total</span>
                <span>₹{total}</span>
              </div>

              {hasDiscount && (
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

          {/* Discount controls (Only visible when status is Completed or Bill Requested) */}
          {(order.status === "Completed" || order.status === "Bill Requested") && (
            <div className="border rounded-2xl p-5 bg-gray-50/50 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold flex items-center gap-2 text-gray-900">
                  <Percent size={18} className="text-olive" />
                  Apply Discount
                </h3>
                {!isDiscountFormOpen && (
                  <button
                    type="button"
                    onClick={() => setIsDiscountFormOpen(true)}
                    className="text-sm font-semibold text-olive hover:text-olive/80 underline focus:outline-none"
                  >
                    {hasDiscount ? "Modify Discount" : "Add Discount"}
                  </button>
                )}
              </div>

              {isDiscountFormOpen && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscountType('percent')}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                        discountType === 'percent'
                          ? 'bg-olive text-white border-olive'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('flat')}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                        discountType === 'flat'
                          ? 'bg-olive text-white border-olive'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      Flat Amount (₹)
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      placeholder={discountType === 'percent' ? "e.g. 10%" : "e.g. 100"}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="flex-grow border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-olive transition"
                    />
                    <button
                      type="button"
                      onClick={handleApplyDiscount}
                      className="bg-olive hover:bg-olive/90 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
                    >
                      Apply
                    </button>
                    {(hasDiscount || discountValue) && (
                      <button
                        type="button"
                        onClick={handleRemoveDiscount}
                        className="border border-red-200 hover:bg-red-50 text-red-600 px-3 py-2 rounded-xl text-sm font-semibold transition"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}

          <div className="flex gap-4">

            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className={`flex-1 text-white py-3 rounded-xl font-semibold transition ${
                isPrinting ? "bg-olive/70 cursor-wait" : "bg-olive hover:bg-olive/90"
              }`}
            >
              {isPrinting ? "Printing..." : "Print Bill"}
            </button>

            <button
              onClick={onClose}
              className="flex-1 border py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
            >
              Close
            </button>

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
                  className={`py-3 rounded-xl font-semibold border transition ${
                    selectedPaymentMethod === method
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

    </div>
  );
}