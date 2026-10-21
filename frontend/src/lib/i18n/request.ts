import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, locales, siteTimeZone } from "./config";

// next-intl calls this once per request (registered in next.config.ts) to get the locale's messages.
// The locale comes from the [locale] segment via setRequestLocale() in the layout.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(locales, requested) ? requested : defaultLocale;

  return {
    locale,
    messages: (await import(`../../../messages/${locale}.json`)).default,
    timeZone: siteTimeZone,
  };
});
