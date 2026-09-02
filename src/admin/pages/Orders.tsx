import { useEffect, useMemo, useState } from "react";
import { exportOrdersExcel } from "../services/excelService";
import SectionHeader from "../components/SectionHeader";
import OrderFilters from "../components/OrderFilters";
import OrderCard from "../components/OrderCard";
import OrderDetailsDrawer from "../components/OrderDetailsDrawer";
import EmptyOrders from "../components/EmptyOrders";

import { listenOrders, deleteAllOrders } from "../services/orderService";

/**
 * Derives the active 7AM -> 1AM shift based on the current time and returns orders 
 * that are completed/paid within that window.
 */
function getPeriodOrders(orders: any[], daysAgo: number) {
  const now = new Date();
  const shiftEnd = new Date(now);
  if (now.getHours() < 7) {
    shiftEnd.setDate(shiftEnd.getDate() - 1);
  }
  shiftEnd.setDate(shiftEnd.getDate() + 1);
  shiftEnd.setHours(1, 0, 0, 0);

  const shiftStart = new Date(shiftEnd);
  shiftStart.setDate(shiftStart.getDate() - daysAgo);
  shiftStart.setHours(7, 0, 0, 0);

  return orders.filter((order) => {
    const created = new Date(order.createdAt);
    return (
      created >= shiftStart &&
      created <= shiftEnd &&
      order.paymentMethod &&
      order.status === "Completed"
    );
  });
}

function getDailyOrders(orders: any[]) {
  return getPeriodOrders(orders, 1);
}

function get15DayOrders(orders: any[]) {
  return getPeriodOrders(orders, 15);
}

function getMonthlyOrders(orders: any[]) {
  const now = new Date();
  const bizDate = new Date(now);
  if (bizDate.getHours() < 7) {
    bizDate.setDate(bizDate.getDate() - 1);
  }

  const shiftStart = new Date(bizDate.getFullYear(), bizDate.getMonth(), 1, 7, 0, 0, 0);
  
  const shiftEnd = new Date(bizDate);
  shiftEnd.setDate(shiftEnd.getDate() + 1);
  shiftEnd.setHours(1, 0, 0, 0);

  return orders.filter((order) => {
    const created = new Date(order.createdAt);
    return (
      created >= shiftStart &&
      created <= shiftEnd &&
      order.paymentMethod &&
      order.status === "Completed"
    );
  });
}

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    const unsubscribe = listenOrders(setOrders);
    return () => unsubscribe();
  }, []);

  // Automatic 1:00 AM download logic
  useEffect(() => {
    const checkAndDownload = () => {
      const now = new Date();
      if (now.getHours() === 1 && now.getMinutes() === 0) {
        const todayStr = now.toLocaleDateString();
        
        // Daily Check
        const lastAutoDownload = localStorage.getItem("lastAutoDownloadDate_daily");
        if (lastAutoDownload !== todayStr) {
          const shiftOrders = getDailyOrders(orders);
          if (shiftOrders.length > 0) exportOrdersExcel(shiftOrders, true, "Daily");
          localStorage.setItem("lastAutoDownloadDate_daily", todayStr);
        }

        // 15-day check (Triggered every 1st and 16th of the month)
        const dayOfMonth = now.getDate();
        if (dayOfMonth === 1 || dayOfMonth === 16) {
          const lastAuto15 = localStorage.getItem("lastAutoDownloadDate_15day");
          if (lastAuto15 !== todayStr) {
            const shiftOrders = get15DayOrders(orders);
            if (shiftOrders.length > 0) exportOrdersExcel(shiftOrders, true, "15Days");
            localStorage.setItem("lastAutoDownloadDate_15day", todayStr);
          }
        }

        // Monthly check (Triggered every 1st of the month)
        if (dayOfMonth === 1) {
          const lastAutoMonth = localStorage.getItem("lastAutoDownloadDate_monthly");
          if (lastAutoMonth !== todayStr) {
            const shiftOrders = getMonthlyOrders(orders);
            if (shiftOrders.length > 0) exportOrdersExcel(shiftOrders, true, "Monthly");
            localStorage.setItem("lastAutoDownloadDate_monthly", todayStr);
          }
        }
      }
    };

    const interval = setInterval(checkAndDownload, 60000); // check every minute
    return () => clearInterval(interval);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.orderNumber?.toString().includes(search) ||
        order.tableNumber?.toString().includes(search);

      const matchesStatus =
        statusFilter === "All" ||
        order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  async function handleDeleteAll() {
    const ok = window.confirm(
      "Delete ALL orders? This cannot be undone."
    );

    if (!ok) return;

    try {
      await deleteAllOrders();
      alert("All orders deleted successfully.");
    } catch (err) {
      console.error(err);
      alert("Unable to delete orders.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => exportOrdersExcel(getDailyOrders(orders), false, "Daily")}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-semibold whitespace-nowrap"
        >
          Download Daily Excel
        </button>
        
        <button
          onClick={() => exportOrdersExcel(get15DayOrders(orders), false, "15Days")}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-semibold whitespace-nowrap"
        >
          Download 15 Days Excel
        </button>

        <button
          onClick={() => exportOrdersExcel(getMonthlyOrders(orders), false, "Monthly")}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-semibold whitespace-nowrap"
        >
          Download Monthly Excel
        </button>

        <button
          onClick={handleDeleteAll}
          className="bg-gray-900 hover:bg-black text-white px-5 py-2 rounded-xl font-semibold whitespace-nowrap"
        >
          Delete All Orders
        </button>
      </div>

      <OrderFilters
        search={search}
        setSearch={setSearch}
        status={statusFilter}
        setStatus={setStatusFilter}
      />

      {filteredOrders.length === 0 ? (
        <EmptyOrders />
      ) : (
        <div className="grid gap-5">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onView={() => {
                setSelectedOrder(order);
                setDrawerOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <OrderDetailsDrawer
        open={drawerOpen}
        order={selectedOrder}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedOrder(null);
        }}
        onOrderCancelled={(orderId) => {
          setOrders((current) => current.filter((order) => order.id !== orderId));
        }}
      />
    </div>
  );
}
