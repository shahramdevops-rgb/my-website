import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { HtmlDocument } from "@/components/layout/HtmlDocument";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { mainContentId, SkipLink } from "@/components/layout/SkipLink";
import { locales } from "@/lib/i18n/config";
import { getSiteInfo } from "@/lib/site/get-site-info";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Only the languages above exist. proxy.ts already sends any other first segment (/de) to a localized 404 page,
// so this is the second line of defence.
export const dynamicParams = false;

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  // Narrows the type to Locale (dynamicParams already keeps other values out).
  if (!hasLocale(locales, locale)) notFound();

  // Tells next-intl the language of this request (we don't use its middleware; proxy.ts handles routing).
  setRequestLocale(locale);

  // Every page renders per request (ADR-025): its scripts must carry this request's CSP nonce (proxy.ts),
  // which a page built once at `next build` could not have.
  await connection();
  const site = await getSiteInfo();

  return (
    <HtmlDocument locale={locale}>
      {/* Makes the messages available to Client Components (language switcher, mobile menu, error page). */}
      <NextIntlClientProvider>
        <SkipLink />
        <SiteHeader locale={locale} siteName={site.name[locale]} />
        {/* tabIndex -1: the skip link can move focus here; the outline would frame the whole page, so none. */}
        <main id={mainContentId} tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <SiteFooter locale={locale} site={site} />
      </NextIntlClientProvider>
    </HtmlDocument>
  );
}
