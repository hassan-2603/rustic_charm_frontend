import { requestAdminJson } from "./adminApi";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

// Configuration
const LANGUAGES = [
  "Russian",
  "German",
  "Spanish",
  "Kazakh",
  "Hebrew",
  "Japanese",
  "Korean",
];

const BATCH_SIZE = 3; // Number of menu items per backend translation request

/**
 * Translate a batch of menu items through the existing backend endpoint.
 */
async function translateBatch(items: any[]): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/api/translate-menu`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items,
      languages: LANGUAGES,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Translation request failed");
  }

  const data = await response.json();
  return (data.translations || []).map((translation: any) => ({
    name: translation.name || {},
    description: translation.description || {},
  }));
}

export async function translateEntireMenu() {
  const all = await requestAdminJson("/menu");
  const docsArray = Array.isArray(all) ? all : [];
  for (let i = 0; i < docsArray.length; i += BATCH_SIZE) {
    const batchDocs = docsArray.slice(i, i + BATCH_SIZE);
    const items = batchDocs.map((doc) => doc || {});
    // Determine if any item in this batch needs translation
    const needsTranslation = items.some((item) => {
      const names = typeof item.name === "object" ? item.name : { English: item.name };
      const descs = typeof item.description === "object" ? item.description : { English: item.description || "" };
      return LANGUAGES.some((lang) => !names[lang] || !descs[lang]);
    });
    if (!needsTranslation) {
      console.log(`Batch ${i / BATCH_SIZE + 1} already fully translated.`);
      continue;
    }

    console.log(`Translating batch ${i / BATCH_SIZE + 1} (${batchDocs.length} items)...`);
    let translationResults: any[] = [];
    try {
      translationResults = await translateBatch(items);
    } catch (e) {
      console.error(`Failed to translate batch ${i / BATCH_SIZE + 1}:`, e);
      // Skip this batch and continue with the next one
      continue;
    }

    // Apply translations back to Firestore documents
    for (let j = 0; j < batchDocs.length; j++) {
      const docItem = batchDocs[j];
      const item = items[j];
      const translatedNames = typeof item.name === "object" ? item.name : { English: item.name };
      const translatedDescs = typeof item.description === "object" ? item.description : { English: item.description || "" };
      const result = translationResults[j];
      // Merge new translations
      LANGUAGES.forEach((lang) => {
        if (result.name?.[lang]) translatedNames[lang] = result.name[lang];
        if (result.description?.[lang]) translatedDescs[lang] = result.description[lang];
      });
      await requestAdminJson(`/menu/${docItem.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: translatedNames, description: translatedDescs }),
      });
      console.log(`Successfully translated "${translatedNames.English}"`);
    }
  }

  alert("Menu items translated successfully.");
}