// Plain-text preview of what a Bill/KOT will contain, shown when a print
// job has FAILED so the waiter/admin can still see the ticket ("Preview"
// button) without it ever being reported as printed. This is a read-only
// convenience render in the browser — the real, exact ESC/POS receipt is
// only ever built server-side / by the connector.

export function buildPreviewText(order: any, type: "BILL" | "KOT"): string {
  const lines: string[] = [];
  lines.push("RUSTIC CHARM");
  lines.push("RESTRO BAR AND CAFE BY DAAOM");
  lines.push("------------------------------------------");

  if (type === "KOT") {
    lines.push("KITCHEN ORDER TICKET");
    lines.push(`KOT No: ${order.orderNumber ?? "--"}`);
    lines.push(`Table: ${order.tableLabel || order.tableReference || order.tableNumber || "--"}`);
    lines.push(`Waiter: ${order.waiterName || "--"}`);
    lines.push("------------------------------------------");
    for (const item of order.items || []) {
      lines.push(`${item.quantity}  ${item.name}`);
    }
  } else {
    lines.push(`Bill No: ${order.orderNumber ?? "--"}`);
    lines.push(`Table: ${order.tableLabel || order.tableReference || order.tableNumber || "--"}`);
    if (order.customerName) lines.push(`Customer: ${order.customerName}`);
    lines.push(`Waiter: ${order.waiterName || "--"}`);
    lines.push("------------------------------------------");
    for (const item of order.items || []) {
      lines.push(`${item.quantity}  ${item.name}  Rs ${item.price}  Rs ${item.price * item.quantity}`);
    }
    lines.push("------------------------------------------");
    if (order.discountAmount > 0) lines.push(`DISCOUNT: -Rs ${order.discountAmount}`);
    lines.push(`TOTAL: Rs ${order.finalTotal ?? order.total}`);
  }

  lines.push("");
  lines.push("Thank You, Visit Again");
  return lines.join("\n");
}

/** Opens a small window with the preview text — no printer involved. */
export function openReceiptPreview(order: any, type: "BILL" | "KOT") {
  const text = buildPreviewText(order, type);
  const win = window.open("", "_blank", "width=380,height=600");
  if (!win) return;
  win.document.write(
    `<pre style="font-family:monospace;font-size:13px;white-space:pre-wrap;padding:16px;">${text.replace(/</g, "&lt;")}</pre>`
  );
  win.document.title = `${type === "BILL" ? "Bill" : "KOT"} Preview — ${order.orderNumber ?? ""}`;
}
