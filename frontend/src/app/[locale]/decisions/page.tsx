import DecisionsEn from "@content/decisions.en.mdx";
import DecisionsFa from "@content/decisions.fa.mdx";
import type { MDXContent } from "mdx/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Decision, DecisionList } from "@/components/decisions/DecisionList";
import { Challenge, Choice, Why } from "@/components/decisions/DecisionParts";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { type Locale, locales } from "@/lib/i18n/config";
import { getSiteInfo } from "@/lib/site/get-site-info";

// The decision cards are prose per language (ADR-012), compiled at build time like the About and Services pages.
const prose: Record<Locale, MDXContent> = { fa: DecisionsFa, en: DecisionsEn };

// Passed in rather than imported by the .mdx files (see the About page); content.test.ts checks fa and en match.
const proseComponents = { DecisionList, Decision, Challenge, Choice, Why };

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/decisions">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();

  await connection();
  const [site, t] = await Promise.all([
    getSiteInfo(),
    getTranslations({ locale, namespace: "decisions" }),
  ]);
  return { title: t("meta.title", { name: site.name[locale] }), description: t("lead") };
}

export default async function DecisionsPage({ params }: PageProps<"/[locale]/decisions">) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);

  await connection();
  const t = await getTranslations({ locale, namespace: "decisions" });
  const Prose = prose[locale];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-16">
      <SectionHeader as="h1" eyebrow={t("eyebrow")} title={t("title")} description={t("lead")} />
      <div className="mt-12">
        <Prose components={proseComponents} />
      </div>
    </div>
  );
}
