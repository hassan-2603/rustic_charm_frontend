import {
  Eye,
  Clock,
  UtensilsCrossed,
  Receipt,
  User,
} from "lucide-react";

import StatusBadge from "./StatusBadge";
import OrderTimerBadge from "../../components/OrderTimerBadge";

type Props = {
  order: any;
  onView: () => void;
};

export default function OrderCard({
  order,
  onView,
}: Props) {
  const created =
    order.createdAt?.toDate?.() ||
    (order.createdAt ? new Date(order.createdAt) : new Date());

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">

      <div className="p-6">

        {/* Top */}

        <div className="flex justify-between items-start gap-3">

          <div>

            <h2 className="text-xl font-bold text-gray-900">
              Order #{order.orderNumber}
            </h2>

            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="font-semibold text-gray-800">
                {order.tableLabel || order.tableReference || `Table ${order.tableNumber || "--"}`}
              </span>
              <span className="text-gray-300">•</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200 shadow-xs">
                <User size={12} className="text-amber-700" />
                <span>Waiter: {order.waiterName || order.waiterId || "Self-ordered"}</span>
              </span>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <div>{order.customerName || ""}</div>
              {order.customerPhone ? <div className="text-gray-500">{order.customerPhone}</div> : null}
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <OrderTimerBadge order={order} showSourceLabel />
            <StatusBadge status={order.status} />
          </div>

        </div>

        {/* Middle */}

        <div className="grid grid-cols-3 gap-5 mt-8">

          <div className="flex items-center gap-3">

            <Receipt
              size={18}
              className="text-olive"
            />

            <div>

              <p className="text-xs text-gray-500">
                Total
              </p>

              <p className="font-semibold">
                ₹{order.total}
              </p>

            </div>

          </div>

          <div className="flex items-center gap-3">

            <UtensilsCrossed
              size={18}
              className="text-olive"
            />

            <div>

              <p className="text-xs text-gray-500">
                Items
              </p>

              <p className="font-semibold">
                {order.items?.length || 0}
              </p>

            </div>

          </div>

          <div className="flex items-center gap-3">

            <Clock
              size={18}
              className="text-olive"
            />

            <div>

              <p className="text-xs text-gray-500">
                Elapsed
              </p>

              <div>
                <OrderTimerBadge order={order} variant="compact" className="text-sm font-semibold" />
              </div>

              <p className="text-[11px] text-gray-400">
                {created.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>

            </div>

          </div>

        </div>

        {/* Footer */}

        <div className="mt-8 flex justify-end">

          <button
            onClick={onView}
            className="flex items-center gap-2 bg-olive hover:bg-olive/90 text-white px-5 py-3 rounded-xl transition font-semibold"
          >
            <Eye size={18} />

            View Details

          </button>

        </div>
        {/* Payment Method */}

<div className="mt-5">
  <span className="text-sm font-medium">
    Payment:
  </span>

  <span
    className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${
      order.paymentMethod === "UPI"
        ? "bg-green-100 text-green-700"
        : order.paymentMethod === "Card"
        ? "bg-blue-100 text-blue-700"
        : order.paymentMethod === "Cash"
        ? "bg-orange-100 text-orange-700"
        : "bg-gray-100 text-gray-600"
    }`}
  >
    {order.paymentMethod || "Not Paid"}
  </span>
</div>

{/* Footer */}

<div className="mt-8 flex justify-end">

  <button
    onClick={onView}
    className="flex items-center gap-2 bg-olive hover:bg-olive/90 text-white px-5 py-3 rounded-xl transition font-semibold"
  >
    <Eye size={18} />
    View Details
  </button>

</div>

      </div>

    </div>
  );
}