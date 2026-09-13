import { Eye } from "lucide-react";

type Props = {
  orders: any[];
  onView: (order: any) => void;
};

export default function OrdersTable({
  orders,
  onView,
}: Props) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

      <table className="w-full">

        <thead className="bg-gray-50">

          <tr>

            <th className="text-left p-5">
              Order
            </th>

            <th className="text-left p-5">
              Table
            </th>

            <th className="text-left p-5">
              Customer
            </th>

            <th className="text-left p-5">
              Status
            </th>

            <th className="text-left p-5">
              Total
            </th>

            <th className="text-right p-5">
              Action
            </th>

          </tr>

        </thead>

        <tbody>

          {orders.map((order) => (

            <tr
              key={order.id}
              className="border-t hover:bg-gray-50"
            >

              <td className="p-5">
                #{order.orderNumber}
              </td>

              <td className="p-5">
                <div className="font-medium text-gray-900">
                  {order.tableLabel || order.tableReference || `Table ${order.tableNumber || "--"}`}
                </div>
                <div className="text-xs font-semibold text-amber-900 mt-0.5">
                  Waiter: {order.waiterName || order.waiterId || "Self-ordered"}
                </div>
              </td>

              <td className="p-5">
                <div className="space-y-1">
                  <div className="font-medium">{order.customerName || ""}</div>
                  {order.customerPhone ? <div className="text-sm text-gray-500">{order.customerPhone}</div> : null}
                </div>
              </td>

              <td className="p-5">
                {order.status}
              </td>

              <td className="p-5">
                ₹{order.total}
              </td>

              <td className="p-5">

                <div className="flex justify-end">

                  <button
                    onClick={() => onView(order)}
                    className="p-2 rounded-lg hover:bg-gray-100"
                  >
                    <Eye size={18}/>
                  </button>

                </div>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}