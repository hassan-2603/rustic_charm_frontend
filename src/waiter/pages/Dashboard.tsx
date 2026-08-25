
import { useEffect, useState } from "react";

import OrderCard, { type PrintButtonState } from "../components/OrderCard";
import DiscountModal from "../../components/DiscountModal";
import SplitBillModal from "../../components/SplitBillModal";
import AddItemModal from "../components/AddItemModal";
import RemoveItemModal from "../components/RemoveItemModal";
import { printBill, printKOT, retryPrint } from "../services/printerService";
import { openReceiptPreview } from "../../utils/receiptPreview";
import type { DiscountPayload } from "../../utils/discountUtils";
import type { PrintJob } from "../../services/printApi";

import {
  listenOrders,
  acceptOrder,
  rejectOrder,
  endSession,
  updateOrderStatus,
  updateOrderDiscount,
  cancelOrder,
  updateOrderSplits,
} from "../services/waiterService";

export default function Dashboard() {

  const waiter = JSON.parse(
    sessionStorage.getItem("waiter") || "{}"
  );

  const [orders, setOrders] = useState<any[]>([]);

  const [paymentOrder, setPaymentOrder] = useState<any>(null);

  const [billStates, setBillStates] = useState<Record<string, PrintButtonState>>({});
  const [kotStates, setKotStates] = useState<Record<string, PrintButtonState>>({});
  const [lastJobId, setLastJobId] = useState<Record<string, string>>({});

  const [discountOrder, setDiscountOrder] = useState<any>(null);

  const [addItemOrder, setAddItemOrder] = useState<any>(null);

  const [removeItemOrder, setRemoveItemOrder] = useState<any>(null);
  const [splitOrder, setSplitOrder] = useState<any>(null);

  useEffect(() => {

    const unsubscribe =
      listenOrders(setOrders);

    return unsubscribe;

  }, []);

  async function handleAcceptOrder(order: any) {
    await acceptOrder(order.id, waiter);
  }

  async function handleRejectOrder(order: any) {
    await rejectOrder(order.id);
  }

  const newOrders = orders.filter(
    (o: any) =>
      o.status === "Pending" &&
      !o.waiterId
  );

  const myOrders = orders.filter(
    (o: any) =>
      o.waiterId === waiter.id &&
      (
        o.status === "Accepted" ||
        o.status === "Preparing" ||
        o.status === "Ready" ||
        o.status === "Served" ||
        o.status === "Bill Requested" ||
        o.status === "Payment Done"
      )
  );
  function handlePaymentDone(order: any) {
    setPaymentOrder(order);
  }
  async function completePayment(method: string) {
    if (!paymentOrder) return;

    await updateOrderStatus(
      paymentOrder.id,
      "Payment Done",
      {
        paymentMethod: method,
      }
    );

    setPaymentOrder(null);
  }
  async function handleEndSession(order: any) {
    await endSession(order);
  }

  async function handlePrintBill(order: any) {
    setBillStates((current) => ({ ...current, [order.id]: { printing: true, result: null } }));
    const outcome = await printBill(order.id, waiter?.id);
    if (outcome.job) setLastJobId((current) => ({ ...current, [`${order.id}:BILL`]: outcome.job!.id }));
    setBillStates((current) => ({
      ...current,
      [order.id]: { printing: false, result: outcome.ok ? "success" : "failed", message: outcome.message },
    }));
  }

  async function handlePrintKOT(order: any) {
    setKotStates((current) => ({ ...current, [order.id]: { printing: true, result: null } }));
    const outcome = await printKOT(order.id, waiter?.id);
    if (outcome.job) setLastJobId((current) => ({ ...current, [`${order.id}:KOT`]: outcome.job!.id }));
    setKotStates((current) => ({
      ...current,
      [order.id]: { printing: false, result: outcome.ok ? "success" : "failed", message: outcome.message },
    }));
  }

  async function handleRetryBill(order: any) {
    const jobId = lastJobId[`${order.id}:BILL`];
    if (!jobId) return handlePrintBill(order);
    setBillStates((current) => ({ ...current, [order.id]: { printing: true, result: null } }));
    const outcome: { job: PrintJob | null; ok: boolean; message: string } = await retryPrint(jobId, "BILL");
    setBillStates((current) => ({
      ...current,
      [order.id]: { printing: false, result: outcome.ok ? "success" : "failed", message: outcome.message },
    }));
  }

  async function handleRetryKOT(order: any) {
    const jobId = lastJobId[`${order.id}:KOT`];
    if (!jobId) return handlePrintKOT(order);
    setKotStates((current) => ({ ...current, [order.id]: { printing: true, result: null } }));
    const outcome: { job: PrintJob | null; ok: boolean; message: string } = await retryPrint(jobId, "KOT");
    setKotStates((current) => ({
      ...current,
      [order.id]: { printing: false, result: outcome.ok ? "success" : "failed", message: outcome.message },
    }));
  }

  function handlePreview(order: any, type: "BILL" | "KOT") {
    openReceiptPreview(order, type);
  }

  function handleOpenDiscount(order: any) {
    setDiscountOrder(order);
  }

  async function handleSaveDiscount(payload: DiscountPayload) {
    if (!discountOrder) return;
    const updated = await updateOrderDiscount(discountOrder.id, payload);
    setOrders((current) =>
      current.map((order) => (order.id === discountOrder.id ? { ...order, ...payload, ...updated } : order))
    );
  }

  function handleOpenAddItem(order: any) {
    setAddItemOrder(order);
  }

  function handleItemsAdded(updated: any) {
    setOrders((current) =>
      current.map((order) => (order.id === updated.id ? { ...order, ...updated } : order))
    );
    setAddItemOrder((current: any) => (current ? { ...current, ...updated } : current));
  }

  function handleOpenRemoveItem(order: any) {
    setRemoveItemOrder(order);
  }

  function handleItemsRemoved(updated: any) {
    setOrders((current) =>
      current.map((order) => (order.id === updated.id ? { ...order, ...updated } : order))
    );
    setRemoveItemOrder((current: any) => (current ? { ...current, ...updated } : current));
  }

  function handleOpenSplit(order: any) {
    setSplitOrder(order);
  }

  async function handleSaveSplit(splits: any[]) {
    if (!splitOrder) return;
    await updateOrderSplits(splitOrder.id, splits);
  }

  async function handleCancelOrder(order: any) {
    const ok = window.confirm(`Cancel Order #${order.orderNumber}? This cannot be undone.`);
    if (!ok) return;
    try {
      await cancelOrder(order.id);
      setOrders((current) => current.filter((o) => o.id !== order.id));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to cancel order.");
    }
  }

  return (

    <div className="p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen">

      <h1 className="text-4xl font-bold">

        Welcome {waiter.name}

      </h1>

      <p className="text-gray-500 mb-8">
        Manage your assigned orders
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        <div>

          <h2 className="text-2xl font-bold mb-5">
            New Orders
          </h2>

          {newOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              buttonText="Accept"
              onAction={handleAcceptOrder}
              onReject={handleRejectOrder}
            />
          ))}

        </div>
        <div>

          <h2 className="text-2xl font-bold mb-5">
            My Orders
          </h2>

          {myOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              buttonText={
                order.status === "Payment Done"
                  ? "End Session"
                  : "💰 Payment Done"
              }
              onAction={
                order.status === "Payment Done"
                  ? handleEndSession
                  : handlePaymentDone
              }
              onSplit={handleOpenSplit}
              onDiscount={handleOpenDiscount}
              onAddItem={handleOpenAddItem}
              onRemoveItem={handleOpenRemoveItem}
              onCancel={handleCancelOrder}
              onPrintBill={handlePrintBill}
              onPrintKOT={handlePrintKOT}
              onRetryBill={handleRetryBill}
              onRetryKOT={handleRetryKOT}
              onPreview={handlePreview}
              billState={billStates[order.id]}
              kotState={kotStates[order.id]}
            />
          ))}

        </div>

      </div>
      {paymentOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white rounded-2xl p-5 sm:p-8 w-full max-w-[420px]">

            <h2 className="text-2xl font-bold mb-6">
              Select Payment Method
            </h2>

            <div className="grid gap-4">

              <button
                onClick={() => completePayment("Card")}
                className="bg-blue-600 text-white rounded-xl py-4 font-semibold hover:bg-blue-700"
              >
                Card
              </button>

              <button
                onClick={() => completePayment("Cash")}
                className="bg-orange-500 text-white rounded-xl py-4 font-semibold hover:bg-orange-600"
              >
                Cash
              </button>

              <button
                onClick={() => completePayment("UPI")}
                className="bg-green-600 text-white rounded-xl py-4 font-semibold hover:bg-green-700"
              >
                UPI
              </button>

              <button
                onClick={() => completePayment("Zomato")}
                className="bg-red-600 text-white rounded-xl py-4 font-semibold hover:bg-red-700"
              >
                Zomato
              </button>

            </div>

          </div>

        </div>
      )}

      <DiscountModal
        open={!!discountOrder}
        order={discountOrder}
        onClose={() => setDiscountOrder(null)}
        onSave={handleSaveDiscount}
      />

      <AddItemModal
        open={!!addItemOrder}
        order={addItemOrder}
        onClose={() => setAddItemOrder(null)}
        onItemAdded={handleItemsAdded}
      />

      <RemoveItemModal
        open={!!removeItemOrder}
        order={removeItemOrder}
        onClose={() => setRemoveItemOrder(null)}
        onItemsRemoved={handleItemsRemoved}
      />

      <SplitBillModal
        open={!!splitOrder}
        order={splitOrder}
        onClose={() => setSplitOrder(null)}
        onSave={handleSaveSplit}
      />

    </div>

  );

}
