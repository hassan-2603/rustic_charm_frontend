import { requestAdminJson } from "./adminApi";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://rustic-charm-backend.onrender.com").replace(/\/$/, "");

export const SUPPORTED_LANGUAGES = [
  { name: "Russian", code: "ru" },
  { name: "German", code: "de" },
  { name: "Spanish", code: "es" },
  { name: "Kazakh", code: "kk" },
  { name: "Hebrew", code: "he" },
  { name: "Japanese", code: "ja" },
  { name: "Korean", code: "ko" },
];

export type TranslationProgress = {
  current: number;
  total: number;
  itemName: string;
  itemsTranslated: number;
  descriptionsTranslated: number;
  skippedCount: number;
};

export type ProgressCallback = (progress: TranslationProgress) => void;

/**
 * Extracts plain English text from a string, JSON string, or multilingual object.
 */
function extractEnglishText(field: any): string {
  if (!field) return "";
  if (typeof field === "object") {
    return String(field.English || field.en || Object.values(field)[0] || "").trim();
  }
  const str = String(field).trim();
  if (str.startsWith("{")) {
    try {
      const parsed = JSON.parse(str);
      if (typeof parsed === "object" && parsed !== null) {
        return String(parsed.English || parsed.en || Object.values(parsed)[0] || "").trim();
      }
    } catch {
      // Keep as string
    }
  }
  return str;
}

/**
 * Extracts multilingual dictionary from a field if already stored as JSON/object.
 */
function extractLanguageDict(field: any): Record<string, string> {
  if (!field) return {};
  if (typeof field === "object") return { ...field };
  const str = String(field).trim();
  if (str.startsWith("{")) {
    try {
      const parsed = JSON.parse(str);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed;
      }
    } catch {
      // Not JSON
    }
  }
  return {};
}

/**
 * Translate a single menu item through the backend endpoint for its missing languages.
 */
async function requestItemTranslation(name: string, description: string, missingLanguages: string[]) {
  const response = await fetch(`${API_BASE_URL}/api/translate-menu`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          name,
          description,
          languages: missingLanguages,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Translation request failed");
  }

  const data = await response.json();
  const res = (data.translations || [])[0];
  return {
    name: res?.name || {},
    description: res?.description || {},
    translations: res?.translations || {},
  };
}

/**
 * Scans the entire menu and translates ONLY untranslated names and descriptions.
 *
 * Strict Non-Destructive Rules:
 * 1. English names and descriptions are NEVER modified.
 * 2. Any previously translated name or description in ANY language is NEVER modified.
 * 3. Descriptions are ONLY translated if the item actually has an English description.
 *    If an item has no description, description remains empty for all languages.
 */
export async function translateEntireMenu(onProgress?: ProgressCallback): Promise<{
  total: number;
  itemsTranslated: number;
  descriptionsTranslated: number;
  skippedCount: number;
}> {
  const all = await requestAdminJson("/menu");
  const docsArray: any[] = Array.isArray(all) ? all : [];
  const total = docsArray.length;

  let itemsTranslated = 0;
  let descriptionsTranslated = 0;
  let skippedCount = 0;

  for (let i = 0; i < total; i++) {
    const item = docsArray[i] || {};
    const englishName = extractEnglishText(item.name);
    const englishDesc = extractEnglishText(item.description);
    const hasEnglishDesc = englishDesc.length > 0;

    const existingTranslations: Record<string, { name?: string; description?: string }> = item.translations || {};
    const existingNames = extractLanguageDict(item.name);
    const existingDescs = extractLanguageDict(item.description);

    // Identify which languages are missing for this item
    const missingLanguages: string[] = [];
    let needsDescTranslation = false;

    for (const lang of SUPPORTED_LANGUAGES) {
      const existingNameVal =
        existingTranslations[lang.code]?.name ||
        existingNames[lang.name] ||
        existingNames[lang.code];

      const hasName = Boolean(existingNameVal && existingNameVal.trim().length > 0);

      const existingDescVal =
        existingTranslations[lang.code]?.description ||
        existingDescs[lang.name] ||
        existingDescs[lang.code];

      // Description is only missing if there is an English description to translate from!
      const hasDesc = !hasEnglishDesc || Boolean(existingDescVal && existingDescVal.trim().length > 0);

      if (!hasName || !hasDesc) {
        missingLanguages.push(lang.name);
        if (hasEnglishDesc && !hasDesc) {
          needsDescTranslation = true;
        }
      }
    }

    // If all languages already have translations, skip immediately
    if (missingLanguages.length === 0) {
      skippedCount++;
      if (onProgress) {
        onProgress({
          current: i + 1,
          total,
          itemName: englishName || `Item #${i + 1}`,
          itemsTranslated,
          descriptionsTranslated,
          skippedCount,
        });
      }
      continue;
    }

    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        itemName: englishName || `Item #${i + 1}`,
        itemsTranslated,
        descriptionsTranslated,
        skippedCount,
      });
    }

    try {
      // Call translation only for the missing languages
      const result = await requestItemTranslation(
        englishName,
        hasEnglishDesc ? englishDesc : "",
        missingLanguages
      );

      // Build updated structures while strictly preserving all existing entries
      const updatedNames: Record<string, string> = {
        ...existingNames,
        English: englishName, // Immutable
      };

      const updatedDescs: Record<string, string> = {
        ...existingDescs,
        English: englishDesc, // Immutable
      };

      const updatedTranslations: Record<string, { name: string; description: string }> = {
        ...existingTranslations,
      };

      for (const lang of SUPPORTED_LANGUAGES) {
        // 1. Name: Preserve existing if present, otherwise fill from new translation
        const existingNameVal =
          existingTranslations[lang.code]?.name ||
          existingNames[lang.name] ||
          existingNames[lang.code];

        const finalName =
          existingNameVal && existingNameVal.trim()
            ? existingNameVal.trim()
            : (result.name?.[lang.name] || result.translations?.[lang.code]?.name || "").trim();

        // 2. Description: Preserve existing if present.
        // If English desc exists, fill missing from new translation; if no English desc, ALWAYS empty string "".
        const existingDescVal =
          existingTranslations[lang.code]?.description ||
          existingDescs[lang.name] ||
          existingDescs[lang.code];

        let finalDesc = "";
        if (existingDescVal && existingDescVal.trim()) {
          finalDesc = existingDescVal.trim();
        } else if (hasEnglishDesc) {
          finalDesc = (result.description?.[lang.name] || result.translations?.[lang.code]?.description || "").trim();
        }

        if (finalName) updatedNames[lang.name] = finalName;
        if (finalDesc) updatedDescs[lang.name] = finalDesc;

        if (finalName) {
          updatedTranslations[lang.code] = {
            name: finalName,
            description: finalDesc,
          };
        }
      }

      // Save to backend (persists in both menu_items and menu_translations table)
      await requestAdminJson(`/menu/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: updatedNames,
          description: updatedDescs,
          translations: updatedTranslations,
        }),
      });

      itemsTranslated++;
      if (needsDescTranslation) descriptionsTranslated++;
    } catch (err) {
      console.error(`Failed to translate item "${englishName}":`, err);
      // Continue with remaining items so a single failure does not abort the entire menu
    }
  }

  return {
    total,
    itemsTranslated,
    descriptionsTranslated,
    skippedCount,
  };
}