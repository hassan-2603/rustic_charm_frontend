export type CategoryType = string;

export interface Category {
  id: string;
  name: string;
  displayOrder: number;
}

export interface Table {
  id: string;
  tableNumber: number;
  area: string;
  areaLabel?: string;
  displayName?: string;
  tableKey?: string;
  occupied: boolean;
  status: string;
  currentOrderId: string;
  currentSessionId?: string;
}

export type Language =
  | 'English'
  | 'Russian'
  | 'German'
  | 'Spanish'
  | 'Kazakh'
  | 'Hebrew'
  | 'Japanese'
  | 'Korean';



export function getLocalizedField(field: any, language: string, fullItem?: any): string {
  if (!field && !fullItem?.translations) return "";

  const langCodeMap: Record<string, string> = {
    Russian: "ru",
    German: "de",
    Spanish: "es",
    Kazakh: "kk",
    Hebrew: "he",
    Japanese: "ja",
    Korean: "ko",
    English: "en",
    ru: "ru",
    de: "de",
    es: "es",
    kk: "kk",
    he: "he",
    ja: "ja",
    ko: "ko",
    en: "en",
  };

  const langCode = langCodeMap[language] || null;

  if (langCode && langCode !== "en" && fullItem?.translations?.[langCode]?.name) {
    return fullItem.translations[langCode].name;
  }

  if (typeof field === "string" && field.trim().startsWith("{")) {
    try {
      field = JSON.parse(field);
    } catch (e) {
      // keep as string
    }
  }

  if (typeof field === "object" && field !== null) {
    const directValue =
      field[language] ||
      field[langCode || ""] ||
      field["English"] ||
      field["en"] ||
      field["Russian"] ||
      field["ru"] ||
      field["German"] ||
      field["de"] ||
      field["Spanish"] ||
      field["es"] ||
      field["Kazakh"] ||
      field["kk"] ||
      field["Hebrew"] ||
      field["he"] ||
      field["Japanese"] ||
      field["ja"] ||
      field["Korean"] ||
      field["ko"] ||
      Object.values(field).find((value) => typeof value === "string" && value.trim());

    if (directValue !== undefined && directValue !== null && String(directValue).trim()) {
      return String(directValue);
    }
  }

  if (typeof field === "string") {
    return field;
  }

  return String(field ?? "");
}

export interface PriceOption {
  quantity: number;
  amount: number;
  unit?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price?: number;
  priceOptions?: PriceOption[];
  rating: number;
  prepTime: string; // e.g. "15-20 min"
  category: CategoryType;
  image: string;
  isVeg: boolean;
  spiceLevel: 0 | 1 | 2 | 3;
  ingredients: string[];
  isAvailable?: boolean;
  metadata?: {
    isMarketPrice?: boolean;
    [key: string]: any;
  };
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
  selectedPriceOption?: PriceOption;
}

export function getMenuPriceOptions(item: Partial<MenuItem> | null | undefined): PriceOption[] {
  if (!item) return [{ quantity: 1, amount: 0 }];

  // Check top-level priceOptions first, then inside metadata as fallback
  const rawOptions = Array.isArray(item.priceOptions) && item.priceOptions.length > 0
    ? item.priceOptions
    : Array.isArray((item as any).metadata?.priceOptions) && (item as any).metadata.priceOptions.length > 0
      ? (item as any).metadata.priceOptions
      : null;

  if (rawOptions) {
    const mapped = rawOptions
      .filter((option: any) => option && Number.isFinite(Number(option.amount)))
      .map((option: any) => ({
        quantity: Number(option.quantity) || 1,
        amount: Number(option.amount) || 0,
        unit: option.unit?.trim() ? option.unit.trim() : undefined,
      }));
    if (mapped.length > 0) return mapped;
  }

  const fallbackPrice = Number(item.price ?? 0);
  return [{ quantity: 1, amount: fallbackPrice }];
}

export function getPriceOptionLabel(option: PriceOption): string {
  if (option.unit && option.unit.trim()) {
    const u = option.unit.trim();
    if (
      isNaN(Number(u)) &&
      (u.toLowerCase().includes("half") ||
        u.toLowerCase().includes("full") ||
        u.toLowerCase().includes("small") ||
        u.toLowerCase().includes("large") ||
        u.toLowerCase().includes("medium") ||
        u.toLowerCase().includes("glass") ||
        u.toLowerCase().includes("bottle") ||
        u.toLowerCase().includes("portion") ||
        u.toLowerCase().includes("plate"))
    ) {
      return u;
    }
    return `${option.quantity} ${u}`;
  }
  return `${option.quantity} ${option.quantity === 1 ? "piece" : "pieces"}`;
}

export function getMenuPriceLabel(item: Partial<MenuItem> | null | undefined): string {
  if (item && (item as any).metadata?.isMarketPrice) {
    return "Market Price";
  }

  const options = getMenuPriceOptions(item);

  if (options.length === 1) {
    return `₹${options[0].amount.toFixed(0)}`;
  }

  const first = options[0];
  const second = options[1];

  if (first && second) {
    return `₹${first.amount.toFixed(0)} / ₹${second.amount.toFixed(0)}`;
  }

  return `₹${options[0].amount.toFixed(0)}`;
}

export type Page =
  | "landing"
  | "menu"
  | "order-status"
  | "session-expired";

export interface Offer {
  id: string;
  title: string;
  description?: string;
  code?: string;
  discountTag?: string;
  isActive?: boolean;
  createdAt?: any;
}

export type OrderStatus = 'Pending' | 'Preparing' | 'Ready' | 'Completed' | 'Served' | 'Bill Requested' | 'Rejected';

export interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  tableNumber: string;
  language: Language;
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
  discountType?: 'percent' | 'flat';
  discountValue?: number;
  discountAmount?: number;
  finalTotal?: number;
}

