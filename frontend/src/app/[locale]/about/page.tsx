import AboutEn from "@content/about.en.mdx";
import AboutFa from "@content/about.fa.mdx";
import type { MDXContent } from "mdx/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Bridge, Bridges } from "@/components/about/Bridges";
import { PhotoSlot } from "@/components/about/PhotoSlot";
import { Skills } from "@/components/about/Skills";
import { Timeline } from "@/components/about/Timeline";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { type Locale, locales } from "@/lib/i18n/config";
import { getSiteInfo } from "@/lib/site/get-site-info";

// The story is prose per language (ADR-012); both files are compiled at build time.
const story: Record<Locale, MDXContent> = { fa: AboutFa, en: AboutEn };

// The components the prose may use. They are passed in rather than imported by the .mdx files, so the content
// holds words only; src/lib/content/content.test.ts checks that fa and en use the same ones.
const storyComponents = { Timeline, Bridges, Bridge, Skills };

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();

  await connection();
  const [site, t] = await Promise.all([
    getSiteInfo(),
    getTranslations({ locale, namespace: "about" }),
  ]);
  return { title: t("meta.title", { name: site.name[locale] }), description: t("lead") };
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);

  await connection();
  const t = await getTranslations({ locale, namespace: "about" });
  const Story = story[locale];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-16">
      <header className="flex flex-col-reverse gap-8 md:flex-row md:items-end md:justify-between">
        <SectionHeader as="h1" eyebrow={t("eyebrow")} title={t("title")} description={t("lead")} />
        <PhotoSlot />
      </header>
      <div className="mt-12">
        <Story components={storyComponents} />
      </div>
    </div>
  );
}
