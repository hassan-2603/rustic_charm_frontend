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
  if (field === null || field === undefined || field === "[object Object]") {
    if (!fullItem?.translations) return "";
  }

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

  const normalizedLang = String(language || "English").trim();
  const langCode = langCodeMap[normalizedLang] || langCodeMap[normalizedLang.toLowerCase()] || "en";
  const isEnglish = langCode === "en";

  // Check translations table/object on fullItem if present
  if (fullItem?.translations) {
    if (!isEnglish && fullItem.translations[langCode]) {
      const isDesc = field === fullItem.description;
      if (isDesc) {
        return fullItem.translations[langCode].description ? String(fullItem.translations[langCode].description).trim() : "";
      }
      if (fullItem.translations[langCode].name) {
        return String(fullItem.translations[langCode].name).trim();
      }
    } else if (isEnglish && fullItem.translations.en) {
      const isDesc = field === fullItem.description;
      if (isDesc && fullItem.translations.en.description) {
        return String(fullItem.translations.en.description).trim();
      }
      if (fullItem.translations.en.name) {
        return String(fullItem.translations.en.name).trim();
      }
    }
  }

  if (field === null || field === undefined || field === "[object Object]") {
    return "";
  }

  // Parse if JSON string
  let parsed = field;
  if (typeof field === "string" && field.trim().startsWith("{")) {
    try {
      parsed = JSON.parse(field);
    } catch {
      // keep as string
    }
  }

  if (typeof parsed === "object" && parsed !== null) {
    if (isEnglish) {
      const enKey = Object.keys(parsed).find((k) => {
        const l = k.toLowerCase().trim();
        return l === "english" || l === "en";
      });
      return enKey && parsed[enKey] ? String(parsed[enKey]).trim() : "";
    } else {
      const targetKey = Object.keys(parsed).find((k) => {
        const l = k.toLowerCase().trim();
        return l === normalizedLang.toLowerCase() || l === langCode.toLowerCase();
      });
      return targetKey && parsed[targetKey] ? String(parsed[targetKey]).trim() : "";
    }
  }

  if (typeof field === "string") {
    const trimmed = field.trim();
    if (trimmed === "[object Object]" || trimmed.startsWith("{")) {
      return "";
    }
    // If a foreign language is chosen, but field is the default English text and no translation exists,
    // do not show English on a foreign language page
    if (!isEnglish && fullItem && field === fullItem.description) {
      return "";
    }
    return trimmed;
  }

  return "";
}

export function getLocalizedCategory(category: any, language: string, allCategories?: any[]): string {
  if (!category || category === "[object Object]") return "";

  const localizedDirect = getLocalizedField(category, language);
  if (localizedDirect) {
    return localizedDirect;
  }

  const normalizedLang = String(language || "English").trim();
  const langCodeMap: Record<string, string> = {
    Russian: "ru", German: "de", Spanish: "es", Kazakh: "kk", Hebrew: "he", Japanese: "ja", Korean: "ko", English: "en"
  };
  const isEnglish = (langCodeMap[normalizedLang] || "en") === "en";

  if (isEnglish) {
    const enCat = getLocalizedField(category, "English");
    if (enCat) return enCat;
  }

  if (Array.isArray(allCategories) && allCategories.length > 0) {
    const rawCatStr = typeof category === "object"
      ? (category.English || category.en || Object.values(category)[0] || "")
      : String(category).trim();

    const matched = allCategories.find((c) => {
      if (c.id === category || c.id === category?.id) return true;
      const cEn = typeof c.name === "object"
        ? (c.name.English || c.name.en || Object.values(c.name)[0] || "")
        : String(c.name || "");
      return String(cEn).trim().toLowerCase() === String(rawCatStr).trim().toLowerCase();
    });

    if (matched && matched.name) {
      const matchLocalized = getLocalizedField(matched.name, language);
      if (matchLocalized) return matchLocalized;
    }
  }

  // If still not matched, extract English or chosen language from JSON/object if possible
  if (typeof category === "string" && category.trim().startsWith("{")) {
    try {
      const p = JSON.parse(category);
      if (isEnglish) {
        return String(p.English || p.en || Object.values(p)[0] || "");
      }
      const matchKey = Object.keys(p).find((k) => k.toLowerCase() === normalizedLang.toLowerCase());
      return matchKey ? String(p[matchKey]) : "";
    } catch {}
  }

  // Never return raw JSON string with multiple languages
  const str = String(category).trim();
  if (str.startsWith("{") || str === "[object Object]") return "";
  return str;
}

export interface PriceOption {
  quantity: number;
  amount: number;
  unit?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  englishName?: string;
  description: string;
  price?: number;
  priceOptions?: PriceOption[];
  rating: number;
  prepTime: string; // e.g. "15-20 min"
  category: CategoryType;
  categoryId?: string;
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
  tableId?: string;
  tableLabel?: string;
  tableReference?: string;
  orderNumber?: string | number;
  language: Language;
  createdAt: string;
  acceptedAt?: string;
  servedAt?: string;
  completedAt?: string;
  waiterId?: string;
  waiterName?: string;
  customerName?: string;
  customerPhone?: string;
  discountType?: 'percent' | 'flat';
  discountValue?: number;
  discountAmount?: number;
  finalTotal?: number;
}

