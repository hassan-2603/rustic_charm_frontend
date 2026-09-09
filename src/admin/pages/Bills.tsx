import { useEffect, useState } from "react";
import { exportRevenueExcel } from "../services/excelService";
import { deleteAllCompletedOrders, listenOrders, getReportOrders } from "../services/orderService";

import SectionHeader from "../components/SectionHeader";
import RevenueCards from "../components/RevenueCards";
import BillsTable from "../components/BillsTable";

export default function Bills() {
  const [orders, setOrders] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

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
      "Clear completed bills from this screen?\n\nNOTE: All order history and sales remain PERMANENTLY saved in your Daily, 15-Day, and Monthly reports."
    );

    if (!ok) return;

    try {
      await deleteAllCompletedOrders();
      alert("Screen bills cleared successfully.\n\nAll reports remain 100% intact and available for download.");
    } catch (err) {
      console.error(err);
      alert("Unable to clear screen bills.");
    }
  }

  async function handleSaveFile() {
    setExporting(true);
    try {
      // Use full report orders so reports are never incomplete even if screen was cleared
      const allReportOrders = await getReportOrders();
      const completedReportOrders = allReportOrders.filter(
        (o: any) =>
          o.status === "Completed" ||
          o.status === "Payment Done" ||
          o.paymentStatus === "Paid" ||
          (o.paymentMethod && o.status !== "Cancelled" && o.status !== "Rejected")
      );

      exportRevenueExcel(completedReportOrders.length > 0 ? completedReportOrders : orders);
    } catch (err) {
      console.error("Error exporting revenue excel:", err);
      exportRevenueExcel(orders);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex gap-3">
        <button
          onClick={handleSaveFile}
          disabled={exporting}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-semibold shadow-sm transition disabled:opacity-50"
          title="Save complete revenue file"
        >
          {exporting ? "Saving..." : "Save file"}
        </button>

        <button
          onClick={handleDeleteAll}
          className="bg-gray-900 hover:bg-black text-white px-5 py-2 rounded-xl font-semibold shadow-sm transition"
          title="Clear bills from active screen. All reports remain 100% safe."
        >
          Clear Screen Bills
        </button>
      </div>

      <RevenueCards orders={orders} />

      <BillsTable orders={orders} />
    </div>
  );
}