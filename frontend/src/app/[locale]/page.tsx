import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { locales } from "@/lib/i18n/config";
import { getSiteInfo } from "@/lib/site/get-site-info";

// Placeholder home page until the Bento home (P3): the site name from the API, in the page's language.
// The theme toggle sits here until the header exists (P2-T9).

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();

  await connection();
  const site = await getSiteInfo();
  return { title: site.name[locale] };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);

  // Render on each request, never at build time: the API isn't running during `next build`.
  await connection();
  const site = await getSiteInfo();
  const t = await getTranslations("theme");

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-4xl font-bold">{site.name[locale]}</h1>
        <ThemeToggle label={t("dark")} />
      </div>
    </main>
  );
}
