// Shared discount + bill-section classification helpers.
//
// Used by both the Admin (OrderDetailsDrawer) and Waiter (Dashboard/OrderCard)
// discount flows, and by the print/bill builders, so that "which items count
// as Liquor" is defined in exactly one place.

/**
 * Any category whose name contains one of these words (case-insensitive) is
 * treated as an alcoholic / liquor category, no matter how it's capitalized
 * or spaced. New categories named e.g. "Beer", "BEER", "craft beer",
 * "Wine List", "Liquor", "Cocktails" etc. are picked up automatically —
 * nothing needs to be hardcoded per-category.
 *
 * "Mocktails" is intentionally NOT matched by "cocktail" (it doesn't contain
 * that substring), so non-alcoholic mocktails correctly stay in the Food
 * section.
 */
const ALCOHOL_KEYWORDS = ["beer", "wine", "liquor", "liqueur", "cocktail", "spirits", "alcohol", "whisky", "whiskey", "vodka", "rum", "gin", "tequila", "brandy"];

/**
 * A category value coming from the API can be a plain string, or a
 * JSON-encoded multi-language object like {"English":"Beer","Russian":"..."}.
 * This extracts a plain, comparable English-ish string either way.
 */
export function getCategoryText(rawCategory: any): string {
  if (!rawCategory) return "";

  let value = rawCategory;
  if (typeof value === "string" && value.trim().startsWith("{")) {
    try {
      value = JSON.parse(value);
    } catch {
      // keep as string
    }
  }

  if (typeof value === "object" && value !== null) {
    return String(
      value.English || value.en || value.Russian || value.ru || Object.values(value).find((v) => typeof v === "string" && v.trim()) || ""
    );
  }

  return String(value);
}

/** True if the given category should be billed/discounted under "Liquor". */
export function isAlcoholCategory(rawCategory: any): boolean {
  const text = getCategoryText(rawCategory).toLowerCase();
  if (!text) return false;
  return ALCOHOL_KEYWORDS.some((keyword) => text.includes(keyword));
}

export type BillLineItem = {
  name: string;
  quantity: number;
  price: number;
  category?: any;
  [key: string]: any;
};

export type SplitItems = {
  foodItems: BillLineItem[];
  alcoholItems: BillLineItem[];
  foodTotal: number;
  alcoholTotal: number;
};

/** Splits an order's items into Food and Liquor groups + their subtotals. */
export function splitItemsByCategory(items: BillLineItem[] | undefined | null): SplitItems {
  const foodItems: BillLineItem[] = [];
  const alcoholItems: BillLineItem[] = [];

  for (const item of items || []) {
    if (isAlcoholCategory(item.category)) alcoholItems.push(item);
    else foodItems.push(item);
  }

  const sum = (list: BillLineItem[]) => list.reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 0), 0);

  return {
    foodItems,
    alcoholItems,
    foodTotal: sum(foodItems),
    alcoholTotal: sum(alcoholItems),
  };
}

export type DiscountMode = "flat" | "category";

export type DiscountPayload = {
  discountMode: DiscountMode;
  discountType?: "flat" | "percent" | null;
  discountValue?: number | null;
  discountAmount: number;
  finalTotal: number;
  foodDiscountPercent?: number | null;
  alcoholDiscountPercent?: number | null;
  foodDiscountAmount?: number | null;
  alcoholDiscountAmount?: number | null;
};

/** Builds a "Direct Amount" discount payload — a flat ₹ amount off the grand total. */
export function buildFlatDiscountPayload(orderTotal: number, amount: number): DiscountPayload {
  const safeAmount = Math.max(0, Math.min(amount, orderTotal));
  return {
    discountMode: "flat",
    discountType: "flat",
    discountValue: safeAmount,
    discountAmount: safeAmount,
    finalTotal: Math.max(0, orderTotal - safeAmount),
    foodDiscountPercent: null,
    alcoholDiscountPercent: null,
    foodDiscountAmount: null,
    alcoholDiscountAmount: null,
  };
}

/** Builds a "By Category" discount payload — independent % off Food and Alcohol subtotals. */
export function buildCategoryDiscountPayload(
  orderTotal: number,
  foodTotal: number,
  alcoholTotal: number,
  foodPercent: number,
  alcoholPercent: number
): DiscountPayload {
  const safeFoodPercent = Math.max(0, Math.min(100, foodPercent || 0));
  const safeAlcoholPercent = Math.max(0, Math.min(100, alcoholPercent || 0));
  const foodDiscountAmount = Math.round((foodTotal * safeFoodPercent) / 100);
  const alcoholDiscountAmount = Math.round((alcoholTotal * safeAlcoholPercent) / 100);
  const discountAmount = foodDiscountAmount + alcoholDiscountAmount;
  return {
    discountMode: "category",
    discountType: null,
    discountValue: null,
    discountAmount,
    finalTotal: Math.max(0, orderTotal - discountAmount),
    foodDiscountPercent: safeFoodPercent,
    alcoholDiscountPercent: safeAlcoholPercent,
    foodDiscountAmount,
    alcoholDiscountAmount,
  };
}

/** Payload that clears any discount previously applied to an order. */
export function buildClearDiscountPayload(): DiscountPayload {
  return {
    discountMode: null as any,
    discountType: null,
    discountValue: null,
    discountAmount: 0,
    finalTotal: null as any,
    foodDiscountPercent: null,
    alcoholDiscountPercent: null,
    foodDiscountAmount: null,
    alcoholDiscountAmount: null,
  };
}
