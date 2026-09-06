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

function wrapText(text: string, width: number): string[] {
  const words = String(text).split(/\s+/).flatMap((word) => {
    if (word.length <= width) return [word];
    const chunks = [];
    for (let index = 0; index < word.length; index += width) {
      chunks.push(word.slice(index, index + width));
    }
    return chunks;
  });
  const result: string[] = [];
  let line = "";
  for (const word of words) {
    if (!word) continue;
    if ((line ? line + " " + word : word).length <= width) {
      line = line ? line + " " + word : word;
    } else {
      if (line) result.push(line);
      line = word;
    }
  }
  if (line) result.push(line);
  return result;
}

function resolveSection(item: any, config: Record<string, string> = {}): string {
  const catId = item.categoryId || item.category_id || "";
  const catName = String(item.category || item.category_name || "").trim().toLowerCase();

  if (catId && config[catId]) return config[catId];
  if (catName) {
    for (const [key, section] of Object.entries(config)) {
      if (key.toLowerCase() === catName) return section;
    }
  }
  if (
    catName.includes("beer") ||
    catName.includes("wine") ||
    catName.includes("whisky") ||
    catName.includes("vodka") ||
    catName.includes("cocktail") ||
    catName.includes("mocktail") ||
    catName.includes("beverage") ||
    catName.includes("bar") ||
    catName.includes("drink")
  ) {
    return "Bar & Beverages";
  }
  if (
    catName.includes("tandoor") ||
    catName.includes("roti") ||
    catName.includes("naan") ||
    catName.includes("bread") ||
    catName.includes("paratha") ||
    catName.includes("kulcha")
  ) {
    return "Indian Tandoor";
  }
  return "Food";
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
    if (order.addedItems && order.addedItems.length > 0) {
      lines.push("*** RUNNING KOT / ADDED ITEMS ***");
    } else if (order.removedItems && order.removedItems.length > 0) {
      lines.push("*** CANCELLED / REMOVED ITEMS ***");
    }
    lines.push(`KOT No: ${order.orderNumber ?? "--"}`);
    lines.push(`Table: ${order.tableLabel || order.tableReference || order.tableNumber || "--"}`);
    lines.push(`Waiter: ${order.waiterName || "--"}`);
    lines.push("------------------------------------------");
    if (order.addedItems && order.addedItems.length > 0) {
      lines.push("--- ADDED ---");
      for (const item of order.addedItems) {
        const qty = String(item.quantity || 1).padStart(3, " ");
        lines.push(`${qty}  ${item.name}`);
      }
    } else if (order.removedItems && order.removedItems.length > 0) {
      lines.push("--- CANCELLED ---");
      for (const item of order.removedItems) {
        const qty = String(item.quantity || 1);
        lines.push(`CANCEL: ${qty.padStart(2, " ")}  ${item.name}`);
      }
    } else {
      for (const item of order.items || []) {
        const qty = String(item.quantity || 1).padStart(3, " ");
        lines.push(`${qty}  ${item.name}`);
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

    lines.push("Particulars              Qty   Rate Amount");
    lines.push("------------------------------------------");

    const formatAmt = (val: any) => {
      const num = Number(val || 0);
      const s = num % 1 === 0 ? String(num) : num.toFixed(2);
      return s.length > 6 ? String(Math.round(num)) : s;
    };

    const formatRightAlignedTotal = (label: string, amount: number, prefix: string = "Rs ") => {
      const num = Number(amount || 0);
      const amtStr = (num % 1 === 0 ? String(num) : num.toFixed(2)).slice(0, 7);
      const rightSide = `${prefix}${amtStr}`.padStart(12, " ");
      const leftSide = label.slice(0, 30).padEnd(30, " ");
      return `${leftSide}${rightSide}`;
    };

    const printItemRows = (items: any[]) => {
      for (const item of items || []) {
        const name = String(item.name || "");
        const qtyVal = Number(item.quantity || 1);
        const rateVal = Number(item.price || 0);
        const amtVal = Number(item.amount ?? (rateVal * qtyVal));

        const quantity = String(qtyVal).padStart(3, " ");
        const rate = formatAmt(rateVal).padStart(6, " ");
        const amt = formatAmt(amtVal).padStart(6, " ");

        const wrapped = wrapText(name, 24);
        for (let i = 0; i < wrapped.length; i++) {
          const lineName = wrapped[i].padEnd(24, " ");
          if (i === 0) {
            lines.push(`${lineName} ${quantity} ${rate} ${amt}`);
          } else {
            lines.push(lineName);
          }
        }
      }
    };

    const { foodItems, alcoholItems, foodTotal, alcoholTotal } = splitItemsByCategory(order.items || []);

    if (foodItems.length > 0) {
      lines.push("FOOD");
      printItemRows(foodItems);
      lines.push(formatRightAlignedTotal("Food Subtotal:", foodTotal));
      if (order.foodDiscountAmount > 0) {
        lines.push(formatRightAlignedTotal(`Discount (${order.foodDiscountPercent}%):`, order.foodDiscountAmount, "-Rs "));
      }
      lines.push("------------------------------------------");
    }

    if (alcoholItems.length > 0) {
      lines.push("LIQUOR");
      printItemRows(alcoholItems);
      lines.push(formatRightAlignedTotal("Liquor Subtotal:", alcoholTotal));
      if (order.alcoholDiscountAmount > 0) {
        lines.push(formatRightAlignedTotal(`Discount (${order.alcoholDiscountPercent}%):`, order.alcoholDiscountAmount, "-Rs "));
      }
      lines.push("------------------------------------------");
    }

    if (!foodItems.length && !alcoholItems.length && order.items?.length) {
      printItemRows(order.items);
      lines.push("------------------------------------------");
    }

    if (order.discountMode !== "category" && order.discountAmount > 0) {
      lines.push(formatRightAlignedTotal("DISCOUNT:", order.discountAmount, "-Rs "));
    }
    lines.push(formatRightAlignedTotal("GRAND TOTAL:", order.finalTotal ?? order.total));
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
      for (const item of order.items || []) {
        const key = item.id || `${item.menuItemId || item.menu_item_id || ""}_${item.name}`;
        currentItemMap[key] = item;
      }
      const lastItemMap: Record<string, any> = {};
      for (const item of order.lastPrintedItems) {
        const key = item.id || `${item.menuItemId || item.menu_item_id || ""}_${item.name}`;
        lastItemMap[key] = item;
      }

      for (const item of order.items || []) {
        const key = item.id || `${item.menuItemId || item.menu_item_id || ""}_${item.name}`;
        const prev = lastItemMap[key];
        if (!prev) addedItemsOverall.push({ ...item });
        else if (item.quantity > prev.quantity) addedItemsOverall.push({ ...item, quantity: item.quantity - prev.quantity });
      }

      for (const item of order.lastPrintedItems) {
        const key = item.id || `${item.menuItemId || item.menu_item_id || ""}_${item.name}`;
        const cur = currentItemMap[key];
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
      const sectionName = resolveSection(item, config);
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
