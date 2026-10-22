import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";

// The 404 page of every localized URL (unknown path, missing post later, /de via proxy.ts), rendered inside the
// [locale] layout. Next adds <meta name="robots" content="noindex">; React 19 moves the <title> into <head>.
export default function LocaleNotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <title>{t("title")}</title>
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="mt-4 text-muted">{t("description")}</p>
      <Link href="/" className="mt-8 inline-block text-accent underline-offset-4 hover:underline">
        {t("home")}
      </Link>
    </div>
  );
}
