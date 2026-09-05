import { useEffect, useState } from "react";
import { exportRevenueExcel } from "../services/excelService";
import { deleteAllCompletedOrders } from "../services/orderService";

import SectionHeader from "../components/SectionHeader";
import RevenueCards from "../components/RevenueCards";
import BillsTable from "../components/BillsTable";

import { listenOrders } from "../services/orderService";

export default function Bills() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = listenOrders((data) => {
      const completed = data.filter(
        (o: any) =>
          o.status === "Completed" ||
          o.status === "Payment Done" ||
          o.paymentStatus === "Paid" ||
          (o.paymentMethod && o.status !== "Cancelled" && o.status !== "Rejected")
      );

      setOrders(completed);
    });

    return () => unsubscribe();
  }, []);
  async function handleDeleteAll() {
  const ok = window.confirm(
    "Delete ALL completed orders?\n\nThis cannot be undone."
  );

  if (!ok) return;

  try {
    await deleteAllCompletedOrders();

    alert("Completed orders deleted successfully.");

  } catch (err) {
    console.error(err);
    alert("Unable to delete orders.");
  }
}

  return (
    <div className="space-y-8">

      <div className="flex gap-3">

  <button
    onClick={() => exportRevenueExcel(orders)}
    className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-semibold"
  >
    Save file
  </button>

  <button
    onClick={handleDeleteAll}
    className="bg-gray-900 hover:bg-black text-white px-5 py-2 rounded-xl font-semibold"
  >
    Delete All
  </button>

</div>

      <RevenueCards orders={orders} />

      <BillsTable orders={orders} />

    </div>
  );
}