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
    if (order.addedItems && order.addedItems.length > 0) {
      lines.push("--- ADDED ---");
      for (const item of order.addedItems) {
        lines.push(`${item.quantity}  ${item.name}`);
      }
    }
    if (order.removedItems && order.removedItems.length > 0) {
      lines.push("--- REMOVED ---");
      for (const item of order.removedItems) {
        lines.push(`${item.quantity}  ${item.name}`);
      }
    }
    if ((!order.addedItems || order.addedItems.length === 0) && (!order.removedItems || order.removedItems.length === 0)) {
      for (const item of order.items || []) {
        lines.push(`${item.quantity}  ${item.name}`);
      }
    }
    if (order.description) {
      lines.push("------------------------------------------");
      lines.push("DESCRIPTION:");
      lines.push(order.description);
      lines.push("");
    }
  } else {
    lines.push(`Bill No: ${order.orderNumber ?? "--"}`);
    lines.push(`Table: ${order.tableLabel || order.tableReference || order.tableNumber || "--"}`);
    if (order.customerName) lines.push(`Customer: ${order.customerName}`);
    lines.push(`Waiter: ${order.waiterName || "--"}`);
    lines.push("------------------------------------------");

    // NOTE: If billSections is needed, it would be passed in options, but for preview we can rely on standard splitting.
    const { foodItems, alcoholItems, foodTotal, alcoholTotal } = splitItemsByCategory(order.items || []);

    if (foodItems.length > 0) {
      lines.push("--- FOOD ---");
      for (const item of foodItems) {
        const namePad = item.name.length > 22 ? item.name.substring(0, 22) : item.name.padEnd(22, " ");
        const qtyPad = String(item.quantity).padStart(3, " ");
        const amtPad = String(item.price * item.quantity).padStart(6, " ");
        lines.push(`${namePad} ${qtyPad}   Rs ${amtPad}`);
      }
      lines.push(`${"Food Subtotal:".padEnd(29, " ")} Rs ${String(foodTotal).padStart(6, " ")}`);
      lines.push("");
    }

    if (alcoholItems.length > 0) {
      lines.push("--- LIQUOR ---");
      for (const item of alcoholItems) {
        const namePad = item.name.length > 22 ? item.name.substring(0, 22) : item.name.padEnd(22, " ");
        const qtyPad = String(item.quantity).padStart(3, " ");
        const amtPad = String(item.price * item.quantity).padStart(6, " ");
        lines.push(`${namePad} ${qtyPad}   Rs ${amtPad}`);
      }
      lines.push(`${"Liquor Subtotal:".padEnd(29, " ")} Rs ${String(alcoholTotal).padStart(6, " ")}`);
      lines.push("");
    }

    lines.push("------------------------------------------");
    if (order.discountAmount > 0) {
      lines.push(`${"DISCOUNT:".padEnd(28, " ")}-Rs ${String(order.discountAmount).padStart(6, " ")}`);
    }
    lines.push(`${"TOTAL:".padEnd(29, " ")} Rs ${String(order.finalTotal ?? order.total).padStart(6, " ")}`);
  }

  lines.push("");
  lines.push("Thank You, Visit Again");
  return lines.join("\n");
}

export function buildPreviewTexts(order: any, type: "BILL" | "KOT", options?: PreviewOptions): { text: string; isKot: boolean }[] {
  if (type === "KOT") {
    const config = options?.kotSections || {};

    let addedItemsOverall: any[] = [];
    let removedItemsOverall: any[] = [];
    let isDiffPrint = false;

    if (order.lastPrintedItems) {
      isDiffPrint = true;
      const currentItemMap: Record<string, any> = {};
      for (const item of order.items || []) currentItemMap[item.id] = item;
      const lastItemMap: Record<string, any> = {};
      for (const item of order.lastPrintedItems) lastItemMap[item.id] = item;

      for (const item of order.items || []) {
        const prev = lastItemMap[item.id];
        if (!prev) addedItemsOverall.push({ ...item });
        else if (item.quantity > prev.quantity) addedItemsOverall.push({ ...item, quantity: item.quantity - prev.quantity });
      }

      for (const item of order.lastPrintedItems) {
        const cur = currentItemMap[item.id];
        if (!cur) removedItemsOverall.push({ ...item });
        else if (cur.quantity < item.quantity) removedItemsOverall.push({ ...item, quantity: item.quantity - cur.quantity });
      }

      if (addedItemsOverall.length === 0 && removedItemsOverall.length === 0) {
        isDiffPrint = false;
      }
    }

    const sectionItems: Record<string, any[]> = {};
    const sectionAddedItems: Record<string, any[]> = {};
    const sectionRemovedItems: Record<string, any[]> = {};

    const processItemIntoSection = (item: any, mapToUpdate: Record<string, any[]>) => {
      const catId = item.categoryId || item.category_id;
      const sectionName = (catId && config[catId]) ? config[catId] : "Unassigned";
      if (!mapToUpdate[sectionName]) mapToUpdate[sectionName] = [];
      mapToUpdate[sectionName].push(item);
    };

    if (isDiffPrint) {
      for (const item of addedItemsOverall) processItemIntoSection(item, sectionAddedItems);
      for (const item of removedItemsOverall) processItemIntoSection(item, sectionRemovedItems);
    } else {
      for (const item of order.items || []) processItemIntoSection(item, sectionItems);
    }

    const keys = Array.from(new Set([
      ...Object.keys(sectionItems),
      ...Object.keys(sectionAddedItems),
      ...Object.keys(sectionRemovedItems)
    ]));

    if (keys.length === 0) return [{ text: buildSinglePreviewText(order, type), isKot: true }];

    return keys.map(sectionName => ({
      text: buildSinglePreviewText({
        ...order,
        items: sectionItems[sectionName] || [],
        addedItems: sectionAddedItems[sectionName] || [],
        removedItems: sectionRemovedItems[sectionName] || [],
      }, type, { splitLabel: `Section: ${sectionName}` }),
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
