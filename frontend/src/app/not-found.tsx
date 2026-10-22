import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { HtmlDocument } from "@/components/layout/HtmlDocument";
import { defaultLocale } from "@/lib/i18n/config";

// 404 page for URLs that match no route (e.g. /fa/no-such-page). There is no locale to go by, so it uses the
// default one. Known gap: /de (an unknown language) gets status 404 but an empty body, because the 404 comes
// from the [locale] layout itself; P2-T9 adds the per-language 404 pages and closes it.
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
