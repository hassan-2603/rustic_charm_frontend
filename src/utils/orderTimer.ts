/**
 * Order Timer Utility
 *
 * Calculates and formats elapsed time for restaurant orders:
 * - If under 60 minutes: displays in minutes (e.g. "15 min", "0 min")
 * - If 60 minutes or more: displays in hours and minutes (e.g. "1 hr 15 min")
 * - Base timestamp:
 *     - If the order was accepted by a waiter: starts from acceptedAt
 *     - Otherwise (pending orders): starts from createdAt
 * - If the order is completed/cancelled: freezes at completion time
 */

export function parseOrderDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    return value.toDate();
  }
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  if (typeof value === "number") {
    // If epoch seconds vs ms
    return new Date(value < 1e11 ? value * 1000 : value);
  }
  if (typeof value === "string") {
    let s = value.trim();
    if (!s) return null;
    // Format SQLite "YYYY-MM-DD HH:MM:SS" to ISO "YYYY-MM-DDTHH:MM:SS"
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
      s = s.replace(" ", "T");
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatOrderDuration(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));

  if (safeMinutes < 60) {
    return `${safeMinutes} min`;
  }

  const hours = Math.floor(safeMinutes / 60);
  const remainingMins = safeMinutes % 60;
  return `${hours} hr ${remainingMins} min`;
}

export interface OrderTimingInfo {
  startTime: Date | null;
  endTime: Date | null;
  source: "accepted" | "created";
  isCompleted: boolean;
  elapsedMs: number;
  totalMinutes: number;
  formatted: string;
  urgency: "normal" | "warning" | "alert";
}

export function getOrderTiming(order: any, referenceNow: number = Date.now()): OrderTimingInfo {
  if (!order) {
    return {
      startTime: null,
      endTime: null,
      source: "created",
      isCompleted: false,
      elapsedMs: 0,
      totalMinutes: 0,
      formatted: "0 min",
      urgency: "normal",
    };
  }

  const acceptedDate = parseOrderDate(order.acceptedAt);
  const createdDate = parseOrderDate(order.createdAt);

  const isAccepted = Boolean(
    acceptedDate ||
    order.status === "Accepted" ||
    order.status === "Preparing" ||
    order.status === "Ready" ||
    order.status === "Served" ||
    order.status === "Bill Requested" ||
    order.status === "Payment Done"
  );

  // If the order has acceptedAt, measure from acceptance; otherwise from creation
  const startTime = (isAccepted && acceptedDate) ? acceptedDate : (createdDate || acceptedDate);
  const source: "accepted" | "created" = (isAccepted && acceptedDate) ? "accepted" : "created";

  // Check if order has reached a terminal state
  const statusStr = String(order.status || "").toLowerCase();
  const isCompleted = statusStr === "completed" || statusStr === "cancelled" || statusStr === "rejected";

  let endTime: Date | null = null;
  if (isCompleted) {
    endTime = parseOrderDate(order.completedAt) || parseOrderDate(order.updatedAt);
  }

  const endMs = (isCompleted && endTime) ? endTime.getTime() : referenceNow;
  const startMs = startTime ? startTime.getTime() : referenceNow;
  const elapsedMs = Math.max(0, endMs - startMs);
  const totalMinutes = Math.floor(elapsedMs / (1000 * 60));

  let urgency: "normal" | "warning" | "alert" = "normal";
  if (totalMinutes >= 40) {
    urgency = "alert";
  } else if (totalMinutes >= 20) {
    urgency = "warning";
  }

  return {
    startTime,
    endTime,
    source,
    isCompleted,
    elapsedMs,
    totalMinutes,
    formatted: formatOrderDuration(totalMinutes),
    urgency,
  };
}
