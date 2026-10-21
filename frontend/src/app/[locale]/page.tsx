import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { locales } from "@/lib/i18n/config";
import { getSiteInfo } from "@/lib/site/get-site-info";

// Placeholder home page until the Bento home (P3): the site name from the API, in the page's language.

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

  return (
    <main>
      <h1>{site.name[locale]}</h1>
    </main>
  );
}
