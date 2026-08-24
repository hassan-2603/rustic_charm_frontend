import { useEffect, useMemo, useState } from "react";
import { exportOrdersExcel } from "../services/excelService";
import SectionHeader from "../components/SectionHeader";
import OrderFilters from "../components/OrderFilters";
import OrderCard from "../components/OrderCard";
import OrderDetailsDrawer from "../components/OrderDetailsDrawer";
import EmptyOrders from "../components/EmptyOrders";

import { listenOrders,deleteAllOrders, } from "../services/orderService";

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);

  const [selectedOrder, setSelectedOrder] =
    useState<any>(null);

  const [drawerOpen, setDrawerOpen] =
    useState(false);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  useEffect(() => {
    const unsubscribe = listenOrders(setOrders);

    return () => unsubscribe();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.orderNumber
          ?.toString()
          .includes(search) ||
        order.tableNumber
          ?.toString()
          .includes(search);

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

    <div className="flex gap-3">

  <button
    onClick={() => exportOrdersExcel(filteredOrders)}
    className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-semibold"
  >
    Save PDF
  </button>

  <button
    onClick={handleDeleteAll}
    className="bg-gray-900 hover:bg-black text-white px-5 py-2 rounded-xl font-semibold"
  >
    Delete
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