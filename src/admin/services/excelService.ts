import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/** Parses a date from any format (Firestore Timestamp, ISO string, Date object) */
function parseDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate(); // Firestore Timestamp
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function fmt(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function fmtDate(value: any): string {
  const d = parseDate(value);
  if (!d) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtTime(value: any): string {
  const d = parseDate(value);
  if (!d) return "";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function resolveTable(order: any): string {
  return (
    order.tableLabel ||
    order.tableReference ||
    (order.tableNumber ? `Table ${order.tableNumber}` : "") ||
    (order.tableArea ? `${order.tableArea}` : "") ||
    ""
  );
}

export function exportOrdersExcel(orders: any[]) {
  const getEnglishName = (val: any) => {
    if (!val) return "";
    if (typeof val === "object") return val.English || Object.values(val)[0] || "";
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        if (typeof parsed === "object" && parsed !== null) {
          return parsed.English || Object.values(parsed)[0] || val;
        }
      } catch {
        // Not JSON
      }
    }
    return val;
  };

  const rows = orders.map((order) => {
    const foods =
      order.items
        ?.map((item: any) => {
          const name = getEnglishName(item.name);
          const categoryName = getEnglishName(item.category);
          const category = categoryName ? ` (${categoryName})` : "";
          const note = item.specialInstructions ? ` (${item.specialInstructions})` : "";
          return `${item.quantity} × ${name}${category}${note}`;
        })
        .join("\n") || "";

    const qty = order.items?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0;

    const itemsTotal = order.items?.reduce(
      (sum: number, item: any) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
      0
    ) || 0;

    return {
      "Restaurant": "Rustic Charm",
      "Order No": fmt(order.orderNumber),
      "Bill No": fmt(order.billNumber),
      "Date": fmtDate(order.createdAt),
      "Time": fmtTime(order.createdAt),
      "Table": resolveTable(order),
      "Area": fmt(order.tableArea),
      "Customer Name": fmt(order.customerName),
      "Customer Phone": fmt(order.customerPhone),
      "Waiter": fmt(order.waiterName),
      "Session ID": fmt(order.sessionId),
      "Foods Ordered": foods,
      "Total Qty": qty,
      "Items Total (₹)": Number(itemsTotal.toFixed(2)),
      "Discount Type": fmt(order.discountType),
      "Discount (₹)": order.discountAmount != null ? Number(Number(order.discountAmount).toFixed(2)) : "",
      "Final Total (₹)": order.finalTotal != null ? Number(Number(order.finalTotal).toFixed(2)) : Number((order.total || 0).toFixed(2)),
      "Payment Method": fmt(order.paymentMethod),
      "Status": fmt(order.status),
      "Accepted At": fmtTime(order.acceptedAt),
      "Served At": fmtTime(order.servedAt),
      "Completed At": fmtTime(order.completedAt),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 16 }, // Restaurant
    { wch: 12 }, // Order No
    { wch: 12 }, // Bill No
    { wch: 14 }, // Date
    { wch: 12 }, // Time
    { wch: 18 }, // Table
    { wch: 12 }, // Area
    { wch: 18 }, // Customer Name
    { wch: 16 }, // Customer Phone
    { wch: 16 }, // Waiter
    { wch: 28 }, // Session ID
    { wch: 55 }, // Foods Ordered
    { wch: 10 }, // Total Qty
    { wch: 16 }, // Items Total
    { wch: 16 }, // Discount Type
    { wch: 14 }, // Discount
    { wch: 16 }, // Final Total
    { wch: 16 }, // Payment Method
    { wch: 16 }, // Status
    { wch: 12 }, // Accepted At
    { wch: 12 }, // Served At
    { wch: 14 }, // Completed At
  ];

  worksheet["!autofilter"] = { ref: "A1:V1" };
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

  const excel = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([excel], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `Orders_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

export function exportRevenueExcel(orders: any[]) {
  const rows = orders.map((order) => ({
    "Restaurant": "Rustic Charm",
    "Bill No": fmt(order.billNumber),
    "Order No": fmt(order.orderNumber),
    "Date": fmtDate(order.createdAt),
    "Time": fmtTime(order.createdAt),
    "Table": resolveTable(order),
    "Area": fmt(order.tableArea),
    "Customer Name": fmt(order.customerName),
    "Customer Phone": fmt(order.customerPhone),
    "Waiter": fmt(order.waiterName),
    "Payment Method": fmt(order.paymentMethod),
    "Status": fmt(order.status),
    "Discount Type": fmt(order.discountType),
    "Discount (₹)": order.discountAmount != null ? Number(Number(order.discountAmount).toFixed(2)) : "",
    "Amount (₹)": order.finalTotal != null
      ? Number(Number(order.finalTotal).toFixed(2))
      : Number((order.total || 0).toFixed(2)),
    "Completed At": fmtDate(order.completedAt) ? `${fmtDate(order.completedAt)} ${fmtTime(order.completedAt)}` : "",
  }));

  const totalRevenue = orders.reduce(
    (sum, order) => sum + (Number(order.finalTotal ?? order.total) || 0),
    0
  );

  rows.push({
    "Restaurant": "",
    "Bill No": "",
    "Order No": "",
    "Date": "",
    "Time": "",
    "Table": "",
    "Area": "",
    "Customer Name": "",
    "Customer Phone": "",
    "Waiter": "",
    "Payment Method": "TOTAL REVENUE",
    "Status": "",
    "Discount Type": "",
    "Discount (₹)": "",
    "Amount (₹)": Number(totalRevenue.toFixed(2)),
    "Completed At": "",
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 16 }, // Restaurant
    { wch: 12 }, // Bill No
    { wch: 12 }, // Order No
    { wch: 14 }, // Date
    { wch: 12 }, // Time
    { wch: 18 }, // Table
    { wch: 12 }, // Area
    { wch: 18 }, // Customer Name
    { wch: 16 }, // Customer Phone
    { wch: 16 }, // Waiter
    { wch: 16 }, // Payment Method
    { wch: 14 }, // Status
    { wch: 16 }, // Discount Type
    { wch: 14 }, // Discount
    { wch: 15 }, // Amount
    { wch: 20 }, // Completed At
  ];

  worksheet["!autofilter"] = { ref: "A1:P1" };
  worksheet["!freeze"] = { ySplit: 1 };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Revenue");

  const excel = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([excel], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `Revenue_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}