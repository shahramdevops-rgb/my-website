import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { HtmlDocument } from "@/components/layout/HtmlDocument";
import { defaultLocale } from "@/lib/i18n/config";

// Last-resort 404 for URLs outside [locale] that match no route (e.g. /internal/other). Page URLs never get here:
// unknown paths under a language hit app/[locale]/[...rest], unknown languages are rewritten by proxy.ts, and both
// show app/[locale]/not-found.tsx. There is no locale to go by here, so it uses the default one.
export default async function NotFound() {
  // Rendered per request like every page, so its scripts get the CSP nonce.
  await connection();
  const t = await getTranslations({ locale: defaultLocale, namespace: "notFound" });

  return (
    <HtmlDocument locale={defaultLocale}>
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-4 text-muted">{t("description")}</p>
      </main>
    </HtmlDocument>
  );
}
