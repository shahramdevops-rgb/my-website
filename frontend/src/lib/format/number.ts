import type { Locale } from "@/lib/i18n/config";
import { numberingSystems } from "./numbering";

/** fa: `۱٬۲۳۴٬۵۶۷`, `۱۲٫۵` · en: `1,234,567`, `12.5` — digits and separators from Intl. */
export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, {
    numberingSystem: numberingSystems[locale],
    ...options,
  }).format(value);
}
