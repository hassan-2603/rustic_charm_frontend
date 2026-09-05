export type TableAreaConfig = {
  key: string;
  label: string;
  count: number;
};

export const DEFAULT_TABLE_AREAS: TableAreaConfig[] = [
  { key: "deck-area", label: "Deck Area", count: 15 },
  { key: "dine-in-area", label: "Dine in area", count: 20 },
  { key: "courtyard-area", label: "Courtyard area", count: 15 },
  { key: "chillout-area", label: "Chillout area", count: 10 },
];

export function buildTableKey(area: string, tableNumber: number | string) {
  const normalizedArea = String(area || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${normalizedArea || "table"}-${String(tableNumber)}`;
}

export function getAreaLabel(area?: string | null) {
  const match = DEFAULT_TABLE_AREAS.find((item) => item.key === area);
  return match?.label || area || "Unassigned Area";
}

export function getTableDisplayName(table: any) {
  if (!table) return "";

  if (table.displayName) return table.displayName;

  const areaLabel = table.areaLabel || getAreaLabel(table.area);
  const tableNumber = table.tableNumber;
  const reference = table.tableKey || table.id || table.tableReference || table.reference;

  if (typeof reference === "string" && reference.includes("-") && !tableNumber && !table.area) {
    return reference;
  }

  if (areaLabel && tableNumber) {
    return `${areaLabel} - Table ${tableNumber}`;
  }

  if (tableNumber) {
    return `Table ${tableNumber}`;
  }

  return "";
}

export function getTableReference(table: any) {
  if (!table) return "";

  return table.tableKey || table.id || buildTableKey(table.area || table.areaLabel || "", table.tableNumber ?? "");
}

export function normalizeTableReference(reference?: string | number | null) {
  if (reference === null || reference === undefined || reference === "") return "";
  return String(reference)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Encodes table reference into an obfuscated token (rc_...)
 * Neither area name nor table number is visible in the URL
 */
export function encodeTableToken(tableOrKey: any): string {
  const key = typeof tableOrKey === 'string'
    ? tableOrKey
    : (tableOrKey?.tableKey || tableOrKey?.id || `${tableOrKey?.area || 'table'}-${tableOrKey?.tableNumber || 1}`);
  const str = String(key).trim().toLowerCase();
  let hex = "";
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) ^ (0x4b + (i % 7));
    hex += code.toString(16).padStart(2, '0');
  }
  return `rc_${hex}`;
}

/**
 * Decodes an obfuscated token (rc_...) back to original key
 */
export function decodeTableToken(token?: string | null): string | null {
  if (!token) return null;
  const str = String(token).trim();
  if (!str.startsWith("rc_")) return null;
  const hex = str.slice(3);
  if (hex.length % 2 !== 0) return null;
  try {
    let result = "";
    for (let i = 0; i < hex.length; i += 2) {
      const code = parseInt(hex.substring(i, i + 2), 16) ^ (0x4b + ((i / 2) % 7));
      result += String.fromCharCode(code);
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * Generates official customer link with obfuscated table token and rustic-charm.in domain
 */
export function generateTableLink(table: any, domain = "https://rustic-charm.in"): string {
  const token = encodeTableToken(table);
  const cleanDomain = domain.replace(/\/+$/, "");
  return `${cleanDomain}/?table=${token}`;
}

export function resolveTableFromReference(tables: any[], reference?: string | number | null) {
  if (!reference || !Array.isArray(tables) || tables.length === 0) return null;

  const rawStr = String(reference).trim();
  
  // Check if reference is an obfuscated token (rc_...)
  const decodedFromToken = decodeTableToken(rawStr);
  const searchTargets = [
    normalizeTableReference(rawStr),
    decodedFromToken ? normalizeTableReference(decodedFromToken) : null,
  ].filter(Boolean) as string[];

  for (const target of searchTargets) {
    if (!target) continue;

    const matched = tables.find((table) => {
      const tableKey = normalizeTableReference(table.tableKey || table.id);
      const displayName = normalizeTableReference(getTableDisplayName(table));
      const areaKey = normalizeTableReference(table.area);
      const areaLabel = normalizeTableReference(table.areaLabel || getAreaLabel(table.area));
      const tableNumber = normalizeTableReference(table.tableNumber);
      const areaTableRef = normalizeTableReference(`${table.area || table.areaLabel || ""}-${table.tableNumber || ""}`);
      const labelledRef = normalizeTableReference(`${areaLabel || areaKey || ""}-${tableNumber}`);
      const tableId = normalizeTableReference(table.id);

      return (
        tableKey === target ||
        tableId === target ||
        displayName === target ||
        areaKey === target ||
        areaTableRef === target ||
        labelledRef === target ||
        normalizeTableReference(`${table.area || ""}-${table.tableNumber || ""}`) === target
      );
    });

    if (matched) return matched;
  }

  return null;
}
