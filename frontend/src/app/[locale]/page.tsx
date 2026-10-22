import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomeBento } from "@/components/bento/HomeBento";
import { locales } from "@/lib/i18n/config";
import { getResume } from "@/lib/resume/get-resume";
import { getSiteInfo } from "@/lib/site/get-site-info";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();

  await connection();
  const [site, t] = await Promise.all([
    getSiteInfo(),
    getTranslations({ locale, namespace: "home" }),
  ]);
  return { title: site.name[locale], description: t("hero.pitch") };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);

  // Render on each request, never at build time: the API isn't running during `next build`.
  await connection();
  // Both requests start at once; the page waits for the slower one, not for their sum.
  const [site, resume] = await Promise.all([getSiteInfo(), getResume(locale)]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-16">
      <HomeBento name={site.name[locale]} resume={resume} />
    </div>
  );
}
