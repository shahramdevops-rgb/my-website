import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { locales, textDirection } from "@/lib/i18n/config";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Only the languages above exist: /de is a 404 without rendering the page (body: see app/not-found.tsx).
export const dynamicParams = false;

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  // Narrows the type to Locale (dynamicParams already keeps other values out).
  if (!hasLocale(locales, locale)) notFound();

  // Tells next-intl the language of this request (we don't use its middleware; proxy.ts only handles "/").
  setRequestLocale(locale);

  return (
    <html lang={locale} dir={textDirection(locale)}>
      <body>
        {/* Makes the messages available to Client Components (the language switcher from P2-T9). */}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
