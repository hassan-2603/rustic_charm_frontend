import { useEffect, useState } from "react";
import StatCard from "../components/StatCard";
import { listenToOrders } from "../services/orderApi";
import { listenToTables } from "../services/tableApi";
import { listenToWaiterCalls } from "../services/waiterApi";
import { getCaptainName, saveCaptainName } from "../services/captainService";


export default function Dashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [captainName, setCaptainName] = useState(getCaptainName);
  const [captainMessage, setCaptainMessage] = useState("");

  useEffect(() => {
  const unsubscribeOrders = listenToOrders(setOrders);
  const unsubscribeTables = listenToTables(setTables);
  const unsubscribeCalls = listenToWaiterCalls(setWaiterCalls);

return () => {
  unsubscribeOrders();
  unsubscribeTables();
  unsubscribeCalls();
};
}, []);

  const pendingOrders = orders.filter(
    (o) => o.status === "Pending"
  ).length;

  const preparingOrders = orders.filter(
    (o) => o.status === "Preparing"
  ).length;

  const servedOrders = orders.filter(
    (o) => o.status === "Served"
  ).length;
  const occupiedTables = tables.filter(
  (table) => table.status === "occupied"
).length;
  const [waiterCalls, setWaiterCalls] = useState<any[]>([]);
  const pendingCalls = waiterCalls.filter(
  (call) => call.status === "pending"
).length;

  function handleSaveCaptain() {
    saveCaptainName(captainName);
    setCaptainName(getCaptainName());
    setCaptainMessage("Captain name saved.");
  }

  return (
    <>
      <h1 className="text-3xl font-bold mb-8">
        Dashboard
      </h1>

      <div className="bg-white rounded-2xl shadow-sm border p-5 mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-semibold">
            Captain Name
            <input
              value={captainName}
              onChange={(event) => {
                setCaptainName(event.target.value);
                setCaptainMessage("");
              }}
              className="mt-1 w-full border rounded-lg px-3 py-2 font-normal"
              placeholder="Enter captain name"
            />
          </label>
          <button onClick={handleSaveCaptain} className="bg-olive text-white px-5 py-2 rounded-xl font-semibold">
            Save
          </button>
          {captainMessage && <span className="text-sm text-green-700">{captainMessage}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">

        <StatCard
          title="Total Orders"
          value={orders.length}
        />

        <StatCard
          title="Pending"
          value={pendingOrders}
        />

        <StatCard
          title="Preparing"
          value={preparingOrders}
        />
        <StatCard
  title="Waiter Calls"
  value={pendingCalls}
/>
        <StatCard
  title="Occupied Tables"
  value={`${occupiedTables} / ${tables.length}`}
/>

        <StatCard
          title="Served"
          value={servedOrders}
        /><div className="mt-10">

  <h2 className="text-2xl font-bold mb-5">
    Live Orders
  </h2>

  <div className="bg-white rounded-2xl shadow overflow-hidden">

    <table className="w-full">

      <thead className="bg-gray-100">

        <tr>

          <th className="text-left p-4">Order</th>

          <th className="text-left p-4">Table</th>

          <th className="text-left p-4">Status</th>

          <th className="text-left p-4">Total</th>

        </tr>

      </thead>

      <tbody>

        {orders
          .filter(o => o.status !== "Completed")
          .map(order => (

          <tr
            key={order.id}
            className="border-t"
          >

            <td className="p-4">
              #{order.orderNumber}
            </td>

            <td className="p-4">
              {order.tableLabel || order.tableReference || `Table ${order.tableNumber || "--"}`}
            </td>

            <td className="p-4">

              <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">

                {order.status}

              </span>

            </td>

            <td className="p-4">
              ₹{order.total}
            </td>

          </tr>

        ))}

      </tbody>

    </table>

  </div>

</div>

      </div>
    </>
  );
}