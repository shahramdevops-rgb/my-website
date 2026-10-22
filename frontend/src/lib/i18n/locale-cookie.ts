import { type Locale, localeCookieName, locales } from "./config";

/** A year: the choice should outlive a session, and choosing again simply overwrites it. */
const maxAgeSeconds = 60 * 60 * 24 * 365;

/** The language the switcher offers on a `locale` page (with two languages: the other one). */
export function otherLocale(locale: Locale): Locale {
  return locales.find((candidate) => candidate !== locale) ?? locale;
}

/**
 * Remembers an explicit language choice in the `lang` cookie, which proxy.ts reads when it redirects `/`.
 * Set from the browser because only a click on the switcher counts as a choice; merely visiting /en does not.
 * SameSite=Lax: the cookie is also sent when another site links to `/`.
 */
export function rememberLocale(locale: Locale): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${localeCookieName}=${locale}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}
