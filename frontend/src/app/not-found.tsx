import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { defaultLocale, textDirection } from "@/lib/i18n/config";

// 404 page for URLs that match no route (e.g. /fa/no-such-page). There is no locale to go by, so it uses the
// default one. Known gap: /de (an unknown language) gets status 404 but an empty body, because the 404 comes
// from the [locale] layout itself; P2-T9 adds the per-language 404 pages and closes it.
export default async function NotFound() {
  // Rendered per request like every page, so its scripts get the CSP nonce.
  await connection();
  const t = await getTranslations({ locale: defaultLocale, namespace: "notFound" });

  return (
    <html lang={defaultLocale} dir={textDirection(defaultLocale)}>
      <body>
        <main>
          <h1>{t("title")}</h1>
          <p>{t("description")}</p>
        </main>
      </body>
    </html>
  );
}
