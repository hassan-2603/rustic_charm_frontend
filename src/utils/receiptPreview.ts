// Plain-text preview of what a Bill/KOT will contain, shown when a print
// job has FAILED so the waiter/admin can still see the ticket ("Preview"
// button) without it ever being reported as printed. This is a read-only
// convenience render in the browser — the real, exact ESC/POS receipt is
// only ever built server-side / by the connector.

import { splitItemsByCategory } from "./discountUtils";

interface PreviewOptions {
  splits?: any[];
  kotSections?: Record<string, string>;
  splitLabel?: string;
}

export function buildSinglePreviewText(order: any, type: "BILL" | "KOT", options?: PreviewOptions): string {
  const lines: string[] = [];
  lines.push("RUSTIC CHARM");
  lines.push("RESTRO BAR AND CAFE BY DAAOM");
  lines.push("------------------------------------------");

  if (options?.splitLabel) {
    lines.push(`*** ${options.splitLabel.toUpperCase()} ***`);
    lines.push("------------------------------------------");
  }

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

    // NOTE: If billSections is needed, it would be passed in options, but for preview we can rely on standard splitting.
    const { foodItems, alcoholItems, foodTotal, alcoholTotal } = splitItemsByCategory(order.items || [], {});

    if (foodItems.length > 0) {
      lines.push("--- FOOD ---");
      for (const item of foodItems) {
        lines.push(`${item.quantity}  ${item.name}  Rs ${item.price}  Rs ${item.price * item.quantity}`);
      }
      lines.push(`Food Subtotal: Rs ${foodTotal}`);
      lines.push("");
    }

    if (alcoholItems.length > 0) {
      lines.push("--- LIQUOR ---");
      for (const item of alcoholItems) {
        lines.push(`${item.quantity}  ${item.name}  Rs ${item.price}  Rs ${item.price * item.quantity}`);
      }
      lines.push(`Liquor Subtotal: Rs ${alcoholTotal}`);
      lines.push("");
    }

    lines.push("------------------------------------------");
    if (order.discountAmount > 0) lines.push(`DISCOUNT: -Rs ${order.discountAmount}`);
    lines.push(`TOTAL: Rs ${order.finalTotal ?? order.total}`);
  }

  lines.push("");
  lines.push("Thank You, Visit Again");
  return lines.join("\n");
}

export function buildPreviewTexts(order: any, type: "BILL" | "KOT", options?: PreviewOptions): { text: string; isKot: boolean }[] {
  if (type === "KOT") {
    const config = options?.kotSections || {};
    const sectionItems: Record<string, any[]> = {};
    for (const item of order.items || []) {
      const catId = item.categoryId || item.category_id;
      const sectionName = (catId && config[catId]) ? config[catId] : "Unassigned";
      if (!sectionItems[sectionName]) sectionItems[sectionName] = [];
      sectionItems[sectionName].push(item);
    }
    const keys = Object.keys(sectionItems);
    if (keys.length === 0) return [{ text: buildSinglePreviewText(order, type), isKot: true }];

    return keys.map(sectionName => ({
      text: buildSinglePreviewText({ ...order, items: sectionItems[sectionName] }, type, { splitLabel: `Section: ${sectionName}` }),
      isKot: true
    }));
  } else {
    const splits = options?.splits || [];
    if (splits.length > 0) {
      return splits.map((split, i) => {
        const splitOrder = {
          ...order,
          items: typeof split.items === "string" ? JSON.parse(split.items) : (split.items || []),
          total: Number(split.subtotal || 0),
          finalTotal: Number(split.total || split.subtotal || 0),
          discountAmount: 0
        };
        return {
          text: buildSinglePreviewText(splitOrder, type, { splitLabel: `Split ${split.billNumber || i + 1} of ${splits.length}` }),
          isKot: false
        };
      });
    }
    return [{ text: buildSinglePreviewText(order, type), isKot: false }];
  }
}

/** Opens a small window with the preview text — no printer involved. */
export function openReceiptPreview(order: any, type: "BILL" | "KOT") {
  // Waiter preview still falls back to unified since they don't fetch split contexts dynamically here.
  const textArr = buildPreviewTexts(order, type).map(t => t.text);
  const fullText = textArr.join("\n\n==========================================\n\n");
  const win = window.open("", "_blank", "width=380,height=600");
  if (!win) return;
  // Increase KOT font size slightly in the external preview window just in case
  const fontSize = type === "KOT" ? "15px" : "13px";
  win.document.write(
    `<pre style="font-family:monospace;font-size:${fontSize};white-space:pre-wrap;padding:16px;">${fullText.replace(/</g, "&lt;")}</pre>`
  );
  win.document.title = `${type === "BILL" ? "Bill" : "KOT"} Preview — ${order.orderNumber ?? ""}`;
}
