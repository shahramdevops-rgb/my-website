import { type Locale, siteTimeZone } from "@/lib/i18n/config";
import { numberingSystems } from "./numbering";

// UTC instant from the API → site time zone → the locale's calendar and digits, all done by Intl (no digit
// replacement by hand). fa: Solar Hijri calendar, Persian digits; en: Gregorian, Latin digits.
const calendars: Record<Locale, string> = { fa: "persian", en: "gregory" };

// Older than this, a relative text ("40 days ago") is less useful than the date itself.
const relativeLimitDays = 30;

type DateInput = Date | string;

function dateFormat(locale: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, {
    calendar: calendars[locale],
    numberingSystem: numberingSystems[locale],
    timeZone: siteTimeZone,
    ...options,
  });
}

/** fa: `۱ فروردین ۱۴۰۵` · en: `March 21, 2026`. */
export function formatDate(value: DateInput, locale: Locale): string {
  return dateFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(value),
  );
}

/** fa: `۱۰ تیر ۱۴۰۵ ساعت ۱۵:۳۰` · en: `July 1, 2026 at 15:30` (24-hour clock in both). */
export function formatDateTime(value: DateInput, locale: Locale): string {
  return dateFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

/** The year in the locale's calendar, e.g. fa: `۱۴۰۵` (footer copyright). */
export function formatYear(value: DateInput, locale: Locale): string {
  return dateFormat(locale, { year: "numeric" }).format(new Date(value));
}

export type RelativeOptions = {
  locale: Locale;
  /** The current time; passed in so the result is testable and the same across one render. */
  now: Date;
  /** The translated "just now" (`time.justNow`); Intl's own word for it reads oddly in Persian. */
  justNow: string;
};

/**
 * fa: `همین الان`, `۵ دقیقه پیش`, `۳ ساعت پیش`, `۳ روز پیش` · en: `just now`, `5 minutes ago` …
 * After 30 days, or for a future value, the plain date.
 */
export function formatRelative(
  value: DateInput,
  { locale, now, justNow }: RelativeOptions,
): string {
  const seconds = (now.getTime() - new Date(value).getTime()) / 1000;
  // Digits via the locale extension ("fa-u-nu-arabext"): TypeScript's lib lacks the numberingSystem option here.
  const relative = new Intl.RelativeTimeFormat(`${locale}-u-nu-${numberingSystems[locale]}`, {
    numeric: "always",
  });

  if (seconds < 0) return formatDate(value, locale);
  if (seconds < 60) return justNow;
  if (seconds < 3600) return relative.format(-Math.floor(seconds / 60), "minute");
  if (seconds < 86_400) return relative.format(-Math.floor(seconds / 3600), "hour");
  if (seconds < relativeLimitDays * 86_400) {
    return relative.format(-Math.floor(seconds / 86_400), "day");
  }
  return formatDate(value, locale);
}
