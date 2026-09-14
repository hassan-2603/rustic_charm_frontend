import { ChefHat, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { listenKitchenOrders, updateOrderStatus } from "../services/kitchenService";
import notificationSound from "../assets/sounds/notification.mp3";
import OrderTimerBadge from "../components/OrderTimerBadge";

interface KitchenDashboardProps {
  onLogout?: () => void;
}

export default function KitchenDashboard({ onLogout }: KitchenDashboardProps = {}) {
  const [orders, setOrders] = useState<any[]>([]);
  const [, forceUpdate] = useState(0);
  const [newOrders, setNewOrders] = useState<Set<string>>(new Set());

  const previousOrderIds = useRef<Set<string>>(new Set());

  const handleLogout = () => {
    sessionStorage.removeItem("kitchenAuth");
    if (onLogout) {
      onLogout();
    } else {
      window.location.reload();
    }
  };

  useEffect(() => {
    const unsubscribe = listenKitchenOrders(setOrders);

    return () => unsubscribe();
  }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      forceUpdate(prev => prev + 1);
    }, 60000);

    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    // First load
    if (previousOrderIds.current.size === 0) {
      orders.forEach((order) => previousOrderIds.current.add(order.id));
      return;
    }

    // Check for new orders
    for (const order of orders) {
      if (!previousOrderIds.current.has(order.id)) {

        // 🔔 Existing notification (keep it)
        const audio = new Audio(notificationSound);
        audio.play().catch(() => { });

        // 🆕 Add NEW badge
        setNewOrders((prev) => {
          const updated = new Set(prev);
          updated.add(order.id);
          return updated;
        });

        // Remove NEW badge after 10 sec
        setTimeout(() => {
          setNewOrders((prev) => {
            const updated = new Set(prev);
            updated.delete(order.id);
            return updated;
          });
        }, 10000);

        break;
      }
    }

    previousOrderIds.current = new Set(
      orders.map((order) => order.id)
    );
  }, [orders]);
  function getElapsedTime(timestamp: any) {
    if (!timestamp) return "";

    const created =
      timestamp.toDate?.() ?? new Date(timestamp);

    const minutes = Math.floor(
      (Date.now() - created.getTime()) / 60000
    );

    if (minutes < 1) return "Just now";

    if (minutes === 1) return "1 min";

    return `${minutes} mins`;
  }
  const pendingCount = orders.filter(
    (o: any) => o.status === "Accepted"
  ).length;

  const preparingCount = orders.filter(
    (o) => o.status === "Preparing"
  ).length;

  const readyCount = orders.filter(
    (o) => o.status === "Ready"
  ).length;
  return (
    <div className="min-h-screen bg-[#f8f6f2]">
      {/* Header */}
      <header className="bg-olive text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-center justify-between w-full lg:w-auto">
            <div className="flex items-center gap-3">
              <ChefHat className="w-8 h-8" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">
                  Kitchen Dashboard
                </h1>
                <p className="text-sm opacity-80">
                  Live Orders
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-xs font-semibold transition"
              title="Logout Kitchen"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full lg:w-auto">

            <div className="bg-yellow-100 rounded-2xl px-5 py-4 w-full shadow-sm">
              <p className="text-xs uppercase tracking-widest text-yellow-700">
                Pending
              </p>

              <h2 className="text-xl sm:text-3xl font-bold text-yellow-900 mt-1">
                {pendingCount}
              </h2>

              <p className="text-xs text-yellow-700 mt-2">
                Waiting
              </p>
            </div>

            <div className="bg-orange-100 rounded-2xl px-5 py-4 w-full shadow-sm">
              <p className="text-xs uppercase tracking-widest text-orange-700">
                Preparing
              </p>

              <h2 className="text-xl sm:text-3xl font-bold text-orange-900 mt-1">
                {preparingCount}
              </h2>

              <p className="text-xs text-orange-700 mt-2">
                In Kitchen
              </p>
            </div>

            <div className="bg-green-100 rounded-2xl px-5 py-4 w-full shadow-sm">
              <p className="text-xs uppercase tracking-widest text-green-700">
                Ready
              </p>

              <h2 className="text-xl sm:text-3xl font-bold text-green-900 mt-1">
                {readyCount}
              </h2>

              <p className="text-xs text-green-700 mt-2">
                Serve Now
              </p>
            </div>

          </div>
        </div>
      </header>

      {/* Orders Area */}

      <main className="max-w-7xl mx-auto p-3 sm:p-6">

        <div className="border-2 border-dashed border-gray-300 rounded-2xl min-h-[60vh] sm:h-[70vh] flex items-center justify-center">

          {orders.length === 0 ? (
            <p className="text-gray-500 text-xl">
              No Orders Yet
            </p>
          ) : (
            <div className="w-full p-3 sm:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto h-full">
              {[...orders].sort((a, b) => {
                const priority = {
                  Accepted: 0,
                  Preparing: 1,
                  Ready: 2,
                  Completed: 3,
                };

                return (
                  priority[a.status as keyof typeof priority] -
                  priority[b.status as keyof typeof priority]
                );
              })
                .map((order: any) => (
                  <div
                    key={order.id}
                    className={`rounded-2xl p-4 sm:p-6 shadow-lg border-l-8 bg-white transition-all duration-300 hover:shadow-xl ${order.status === "Accepted"
                        ? "bg-yellow-100 text-yellow-800"
                        : order.status === "Preparing"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-green-100 text-green-700"
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-5">

                      <div>

                        <p className="text-xs uppercase tracking-widest text-gray-500">
                          Order
                        </p>

                        <div className="flex items-center gap-3">
                          <h2 className="text-3xl font-bold">
                            {order.orderNumber}
                          </h2>

                          {newOrders.has(order.id) && (
                            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-lg">
                              🆕 NEW
                            </span>
                          )}
                        </div>

                      </div>

                      <span
                        className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm font-bold ${order.status === "Pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : order.status === "Preparing"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-green-100 text-green-700"
                          }`}
                      >
                        {order.status}
                      </span>

                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 mb-5">

                      <p className="font-semibold">
                        {order.tableLabel || order.tableReference || `Table ${order.tableNumber || "--"}`}
                      </p>

                      <OrderTimerBadge order={order} showSourceLabel />

                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 mb-5">

                      <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">
                        Items
                      </p>

                      <div className="space-y-3">

                        {order.items?.map((item: any, index: number) => (

                          <div
                            key={index}
                            className="flex justify-between items-center"
                          >

                            <div className="flex items-center gap-3">

                              <span className="bg-olive text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                                {item.quantity}
                              </span>

                              <span className="font-medium">
                                {item.name}
                              </span>

                            </div>

                          </div>

                        ))}

                      </div>

                    </div>
                    <div className="mt-5">

                      {order.orderSource === "admin" && order.status === "Accepted" && (
                        <button
                          onClick={() => updateOrderStatus(order.id, "Completed", { completedAt: new Date().toISOString() })}
                          className="w-full sm:w-auto bg-olive hover:bg-olive/90 text-white px-5 py-3 rounded-xl font-semibold shadow-md"
                        >
                          Complete
                        </button>
                      )}

                      {order.orderSource !== "admin" && order.status === "Accepted" && (
                        <button
                          onClick={() => updateOrderStatus(order.id, "Preparing")}
                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold shadow-md"
                        >
                          🍳 Start Cooking
                        </button>
                      )}

                      {order.status === "Preparing" && (
                        <button
                          onClick={() => updateOrderStatus(order.id, "Ready")}
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-semibold shadow-md"
                        >
                          🍽 Plate & Ready
                        </button>
                      )}

                      {order.status === "Ready" && (
                        <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-xl font-semibold">
                          ✅ Waiting for Waiter
                        </div>
                      )}

                    </div>
                  </div>
                ))}
            </div>
          )}

        </div>

      </main>

    </div>
  );
}