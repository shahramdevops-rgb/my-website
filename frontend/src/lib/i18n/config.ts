import { defineRouting } from "next-intl/routing";

/** The one place the site's languages are defined (rules.md §11). `fa` first: it is the default for now (ADR-023). */
export const locales = ["fa", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fa";

/** Set by the language switcher (P2-T9); read by `proxy.ts` to send `/` to the visitor's choice. */
export const localeCookieName = "lang";

/** All dates are shown in the site's time zone, whatever the visitor's: the site's events happen in Tehran. */
export const siteTimeZone = "Asia/Tehran";

const directions: Record<Locale, "rtl" | "ltr"> = { fa: "rtl", en: "ltr" };

export function textDirection(locale: Locale): "rtl" | "ltr" {
  return directions[locale];
}

/** next-intl's view of the same settings (used by its navigation helpers from P2-T9). */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeCookie: { name: localeCookieName },
});
