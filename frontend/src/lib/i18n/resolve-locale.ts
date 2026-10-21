import { defaultLocale, type Locale, locales } from "./config";

/**
 * Which language `/` redirects to (architecture.md §5.4): the `lang` cookie (an explicit choice) wins, then the
 * browser's `Accept-Language`, then the default. GeoIP joins between the two in P15.
 */
export function resolveLocale(
  cookieValue: string | undefined,
  acceptLanguage: string | null,
): Locale {
  if (isLocale(cookieValue)) return cookieValue;

  return preferredLocale(acceptLanguage) ?? defaultLocale;
}

function isLocale(value: string | undefined): value is Locale {
  return (locales as readonly string[]).includes(value ?? "");
}

/**
 * `Accept-Language: de-DE, en-US;q=0.8, fa;q=0.5` → `en`: the supported language with the highest weight.
 * Only the primary subtag counts (`en-GB` is `en`); `q=0` means "not this one".
 */
function preferredLocale(header: string | null): Locale | undefined {
  if (!header) return undefined;

  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q ? Number(q.slice(2)) : 1;
      return {
        language: tag.split("-")[0]?.toLowerCase(),
        weight: Number.isNaN(weight) ? 0 : weight,
        index,
      };
    })
    .filter((entry) => entry.weight > 0)
    // Higher weight first; equal weights keep the browser's order.
    .sort((a, b) => b.weight - a.weight || a.index - b.index);

  return ranked.map((entry) => entry.language).find(isLocale);
}
