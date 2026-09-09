import { useEffect, useMemo, useState } from "react";
import { exportOrdersExcel } from "../services/excelService";
import SectionHeader from "../components/SectionHeader";
import OrderFilters from "../components/OrderFilters";
import OrderCard from "../components/OrderCard";
import OrderDetailsDrawer from "../components/OrderDetailsDrawer";
import EmptyOrders from "../components/EmptyOrders";

import { listenOrders, getReportOrders, deleteAllOrders } from "../services/orderService";

function parseOrderDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  let s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
    s = s.replace(" ", "T");
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function toIndiaDate(date: Date): Date {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    }).formatToParts(date);
    const p: Record<string, number> = {};
    for (const part of parts) {
      if (part.type !== 'literal') p[part.type] = parseInt(part.value, 10);
    }
    return new Date(p.year, p.month - 1, p.day, p.hour === 24 ? 0 : p.hour, p.minute, p.second);
  } catch {
    const tzStr = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const d = new Date(tzStr);
    return isNaN(d.getTime()) ? date : d;
  }
}

function getOrderBizDate(order: any): Date | null {
  const d = parseOrderDate(order.createdAt);
  if (!d) return null;
  const bizDate = toIndiaDate(d);
  if (bizDate.getHours() < 7) {
    bizDate.setDate(bizDate.getDate() - 1);
  }
  return bizDate;
}

function getTodayBizDate(): Date {
  const bizDate = toIndiaDate(new Date());
  if (bizDate.getHours() < 7) {
    bizDate.setDate(bizDate.getDate() - 1);
  }
  return bizDate;
}

function formatStr(date: Date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${date.getFullYear()}`;
}

function isEligibleForReport(order: any): boolean {
  if (!order) return false;
  const status = String(order.status || "").toLowerCase();
  // Exclude cancelled and rejected orders from sales reports
  if (status === "rejected" || status === "cancelled") return false;
  return true;
}

function getDailyOrders(orders: any[], targetBizDate = getTodayBizDate()) {
  const y = targetBizDate.getFullYear();
  const m = targetBizDate.getMonth();
  const d = targetBizDate.getDate();

  return orders.filter((order) => {
    if (!isEligibleForReport(order)) return false;
    const b = getOrderBizDate(order);
    return b && b.getFullYear() === y && b.getMonth() === m && b.getDate() === d;
  });
}

function get15DayFirstHalfOrders(orders: any[], targetDate = getTodayBizDate()) {
  const y = targetDate.getFullYear();
  const m = targetDate.getMonth();

  return orders.filter((order) => {
    if (!isEligibleForReport(order)) return false;
    const b = getOrderBizDate(order);
    return b && b.getFullYear() === y && b.getMonth() === m && b.getDate() >= 1 && b.getDate() <= 15;
  });
}

function get15DaySecondHalfOrders(orders: any[], targetDate = getTodayBizDate()) {
  const y = targetDate.getFullYear();
  const m = targetDate.getMonth();

  return orders.filter((order) => {
    if (!isEligibleForReport(order)) return false;
    const b = getOrderBizDate(order);
    return b && b.getFullYear() === y && b.getMonth() === m && b.getDate() >= 16;
  });
}

function getMonthlyOrders(orders: any[], targetDate = getTodayBizDate()) {
  const y = targetDate.getFullYear();
  const m = targetDate.getMonth();

  return orders.filter((order) => {
    if (!isEligibleForReport(order)) return false;
    const b = getOrderBizDate(order);
    return b && b.getFullYear() === y && b.getMonth() === m;
  });
}

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [downloading, setDownloading] = useState(false);

  // Active unarchived orders on screen
  useEffect(() => {
    const unsubscribe = listenOrders(setOrders);
    return () => unsubscribe();
  }, []);

  // Automatic download schedule (Daily, 15-day, Monthly)
  // ALWAYS uses getReportOrders() so data is never missed even if screen orders were cleared
  useEffect(() => {
    const checkAndDownload = async () => {
      try {
        const now = toIndiaDate(new Date());
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const currentHour = now.getHours();
        const dayOfMonth = now.getDate();

        // Daily Auto-Download (Triggered after 1:00 AM)
        if (currentHour >= 1) {
          const lastAutoDaily = localStorage.getItem("lastAutoDownloadDate_daily");
          if (lastAutoDaily !== todayStr) {
            const allReportOrders = await getReportOrders();
            const yesterdayBiz = new Date(now);
            yesterdayBiz.setDate(yesterdayBiz.getDate() - 1);
            const dailyOrders = getDailyOrders(allReportOrders, yesterdayBiz);
            if (dailyOrders.length > 0) {
              const dStr = formatStr(yesterdayBiz);
              exportOrdersExcel(dailyOrders, true, "Daily_Report", { start: dStr, end: dStr });
              localStorage.setItem("lastAutoDownloadDate_daily", todayStr);
            }
          }
        }

        // 15-Day Auto-Download: 1st-15th (Triggered on the 16th of each month after 1:00 AM)
        if (dayOfMonth === 16 && currentHour >= 1) {
          const lastAuto15 = localStorage.getItem("lastAutoDownloadDate_15day_first_half");
          if (lastAuto15 !== todayStr) {
            const allReportOrders = await getReportOrders();
            const firstHalfOrders = get15DayFirstHalfOrders(allReportOrders, now);
            if (firstHalfOrders.length > 0) {
              const y = now.getFullYear(), m = now.getMonth();
              const start = formatStr(new Date(y, m, 1));
              const end = formatStr(new Date(y, m, 15));
              exportOrdersExcel(firstHalfOrders, true, "15Days_1st_to_15th", { start, end });
              localStorage.setItem("lastAutoDownloadDate_15day_first_half", todayStr);
            }
          }
        }

        // 15-Day (16th-End) & Monthly Auto-Download (Triggered on the 1st of every month after 1:00 AM)
        if (dayOfMonth === 1 && currentHour >= 1) {
          const lastAutoMonth = localStorage.getItem("lastAutoDownloadDate_monthly_cycle");
          if (lastAutoMonth !== todayStr) {
            const allReportOrders = await getReportOrders();
            const prevMonthDate = new Date(now);
            prevMonthDate.setDate(0); // Last day of previous month
            const y = prevMonthDate.getFullYear(), m = prevMonthDate.getMonth();
            const lastDay = prevMonthDate.getDate();

            // 16th to End of previous month
            const secondHalfOrders = get15DaySecondHalfOrders(allReportOrders, prevMonthDate);
            if (secondHalfOrders.length > 0) {
              const start = formatStr(new Date(y, m, 16));
              const end = formatStr(new Date(y, m, lastDay));
              exportOrdersExcel(secondHalfOrders, true, "15Days_16th_to_End", { start, end });
            }

            // Full Monthly for previous month
            const fullMonthOrders = getMonthlyOrders(allReportOrders, prevMonthDate);
            if (fullMonthOrders.length > 0) {
              const start = formatStr(new Date(y, m, 1));
              const end = formatStr(new Date(y, m, lastDay));
              exportOrdersExcel(fullMonthOrders, true, "Monthly_Report", { start, end });
            }

            localStorage.setItem("lastAutoDownloadDate_monthly_cycle", todayStr);
          }
        }
      } catch (e) {
        console.error("Auto-download error:", e);
      }
    };

    checkAndDownload();
    const interval = setInterval(checkAndDownload, 60000);
    return () => clearInterval(interval);
  }, []);

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
      "Clear active orders from this screen?\n\nNOTE: All order history and sales remain PERMANENTLY saved in your Daily, 15-Day, and Monthly reports."
    );

    if (!ok) return;

    try {
      await deleteAllOrders();
      alert("Screen cleared successfully.\n\nAll orders remain 100% intact and available in your reports.");
    } catch (err) {
      console.error(err);
      alert("Unable to clear screen orders.");
    }
  }

  async function handleDownloadReport(type: "Daily" | "15Days_1" | "15Days_2" | "Monthly") {
    setDownloading(true);
    try {
      // ALWAYS load full report orders (including soft-archived) so no orders are ever lost
      const allReportOrders = await getReportOrders();
      const targetDate = getTodayBizDate();
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const lastDay = new Date(y, m + 1, 0).getDate();

      let list: any[] = [];
      let prefix = "Orders";
      let rangeOverride: { start: string; end: string } | undefined;

      if (type === "Daily") {
        list = getDailyOrders(allReportOrders, targetDate);
        prefix = "Daily_Report";
        const dStr = formatStr(targetDate);
        rangeOverride = { start: dStr, end: dStr };

        if (list.length === 0) {
          // Fallback to most recent day with orders if today has no orders yet
          const eligible = allReportOrders.filter(isEligibleForReport);
          if (eligible.length > 0) {
            const mostRecentBiz = getOrderBizDate(eligible[0]) || targetDate;
            list = getDailyOrders(allReportOrders, mostRecentBiz);
            const rStr = formatStr(mostRecentBiz);
            rangeOverride = { start: rStr, end: rStr };
          }
        }
      } else if (type === "15Days_1") {
        list = get15DayFirstHalfOrders(allReportOrders, targetDate);
        prefix = "15Days_1st_to_15th";
        rangeOverride = {
          start: formatStr(new Date(y, m, 1)),
          end: formatStr(new Date(y, m, 15)),
        };
      } else if (type === "15Days_2") {
        list = get15DaySecondHalfOrders(allReportOrders, targetDate);
        prefix = "15Days_16th_to_End";
        rangeOverride = {
          start: formatStr(new Date(y, m, 16)),
          end: formatStr(new Date(y, m, lastDay)),
        };
      } else if (type === "Monthly") {
        list = getMonthlyOrders(allReportOrders, targetDate);
        prefix = "Monthly_Report";
        rangeOverride = {
          start: formatStr(new Date(y, m, 1)),
          end: formatStr(new Date(y, m, lastDay)),
        };
      }

      if (list.length === 0) {
        alert(`No order history found for this period (${rangeOverride?.start} to ${rangeOverride?.end}).`);
        return;
      }

      exportOrdersExcel(list, false, prefix, rangeOverride);
    } catch (err) {
      console.error("Error generating report:", err);
      alert("Failed to download report. Please check connection.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex gap-3 flex-wrap items-center">
        <button
          onClick={() => handleDownloadReport("Daily")}
          disabled={downloading}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold whitespace-nowrap shadow-sm transition flex items-center gap-2"
          title="Download today's business day sales report"
        >
          <span>📊</span> Download Daily Excel
        </button>
        
        <button
          onClick={() => handleDownloadReport("15Days_1")}
          disabled={downloading}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold whitespace-nowrap shadow-sm transition flex items-center gap-2"
          title="Download 1st to 15th half-month report"
        >
          <span>📅</span> Download 15 Days (1st - 15th)
        </button>

        <button
          onClick={() => handleDownloadReport("15Days_2")}
          disabled={downloading}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold whitespace-nowrap shadow-sm transition flex items-center gap-2"
          title="Download 16th to end-of-month report"
        >
          <span>📅</span> Download 15 Days (16th - End)
        </button>

        <button
          onClick={() => handleDownloadReport("Monthly")}
          disabled={downloading}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-semibold whitespace-nowrap shadow-sm transition flex items-center gap-2"
          title="Download full month report (1st to end)"
        >
          <span>🗓️</span> Download Monthly Excel
        </button>

        <button
          onClick={handleDeleteAll}
          className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-semibold whitespace-nowrap shadow-sm transition flex items-center gap-2 ml-auto"
          title="Clears orders from active screen. Daily, 15-Day, and Monthly reports remain 100% saved."
        >
          <span>🧹</span> Clear Screen Orders
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
