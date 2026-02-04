import { en, Translations } from "./en";
import { zh } from "./zh";

export type Language = "en" | "zh";

const translations: Record<Language, Translations> = { en, zh };

export function getTranslations(lang: Language): Translations {
  return translations[lang] || translations.en;
}

export function t(
  translations: Translations,
  key: string,
  params?: Record<string, string | number>,
): string {
  const keys = key.split(".");
  let value: unknown = translations;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }

  if (typeof value !== "string") return key;

  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, paramKey) =>
      String(params[paramKey] ?? `{${paramKey}}`),
    );
  }

  return value;
}

export { en, zh };
export type { Translations };
