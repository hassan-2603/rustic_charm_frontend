import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { getOrderTiming, type OrderTimingInfo } from "../utils/orderTimer";

interface OrderTimerBadgeProps {
  order: any;
  variant?: "badge" | "compact" | "pill";
  showSourceLabel?: boolean;
  className?: string;
}

export default function OrderTimerBadge({
  order,
  variant = "badge",
  showSourceLabel = false,
  className = "",
}: OrderTimerBadgeProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    // If order is in a terminal state, no need to tick continuously
    const statusStr = String(order?.status || "").toLowerCase();
    const isTerminal = statusStr === "completed" || statusStr === "cancelled" || statusStr === "rejected";
    if (isTerminal) return;

    // Update every 5 seconds so minute transitions are captured smoothly
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 5000);

    return () => clearInterval(interval);
  }, [order?.status, order?.id]);

  const timing: OrderTimingInfo = getOrderTiming(order, now);

  if (!timing.startTime) {
    return null;
  }

  const tooltipTitle = timing.isCompleted
    ? `Order completed in ${timing.formatted} (Started: ${timing.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`
    : timing.source === "accepted"
    ? `Accepted at ${timing.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • Elapsed: ${timing.formatted}`
    : `Created at ${timing.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • Elapsed: ${timing.formatted}`;

  const sourceLabel = timing.isCompleted
    ? "Completed"
    : timing.source === "accepted"
    ? "Accepted"
    : "Waiting";

  // Color styles based on urgency
  let colorClasses = "bg-blue-50 text-blue-700 border-blue-200";
  let iconClasses = "text-blue-600";

  if (timing.isCompleted) {
    colorClasses = "bg-gray-100 text-gray-700 border-gray-200";
    iconClasses = "text-gray-500";
  } else if (timing.urgency === "alert") {
    colorClasses = "bg-red-50 text-red-700 border-red-200 animate-pulse";
    iconClasses = "text-red-600";
  } else if (timing.urgency === "warning") {
    colorClasses = "bg-amber-50 text-amber-800 border-amber-200";
    iconClasses = "text-amber-600";
  }

  if (variant === "compact") {
    return (
      <span
        title={tooltipTitle}
        className={`inline-flex items-center gap-1 font-semibold text-xs ${
          timing.isCompleted
            ? "text-gray-600"
            : timing.urgency === "alert"
            ? "text-red-600 font-bold"
            : timing.urgency === "warning"
            ? "text-amber-700"
            : "text-blue-700"
        } ${className}`}
      >
        <Clock size={12} className={iconClasses} />
        <span>{timing.formatted}</span>
        {showSourceLabel && (
          <span className="text-[10px] font-normal opacity-75">({sourceLabel})</span>
        )}
      </span>
    );
  }

  if (variant === "pill") {
    return (
      <span
        title={tooltipTitle}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-xs ${colorClasses} ${className}`}
      >
        <Clock size={13} className={iconClasses} />
        <span>{timing.formatted}</span>
        <span className="text-[10px] opacity-80 border-l border-current/20 pl-1.5 ml-0.5">
          {sourceLabel}
        </span>
      </span>
    );
  }

  // Default "badge"
  return (
    <span
      title={tooltipTitle}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-2xs ${colorClasses} ${className}`}
    >
      <Clock size={13} className={iconClasses} />
      <span>{timing.formatted}</span>
      {showSourceLabel && (
        <span className="text-[10px] opacity-75 font-normal">({sourceLabel})</span>
      )}
    </span>
  );
}
