import { useLanguage } from "../context/LanguageContext";
import { TRANSLATIONS } from "../data/translations";
import { Language } from "../types";

const CODE_TO_LANGUAGE: Record<string, Language> = {
  en: "English",
  ru: "Russian",
  de: "German",
  es: "Spanish",
  kk: "Kazakh",
  he: "Hebrew",
  ja: "Japanese",
  ko: "Korean",
};

export function useTranslation() {
  const { language } = useLanguage();
  const fullLang: Language = CODE_TO_LANGUAGE[language] || (language as Language) || "English";

  function t(key: string) {
    const langDict = TRANSLATIONS[fullLang] || TRANSLATIONS.English;
    return langDict?.[key] ?? TRANSLATIONS.English?.[key] ?? key;
  }

  return { t, language: fullLang };
}