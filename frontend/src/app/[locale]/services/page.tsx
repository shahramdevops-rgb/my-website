import ServicesEn from "@content/services.en.mdx";
import ServicesFa from "@content/services.fa.mdx";
import type { MDXContent } from "mdx/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProjectCta } from "@/components/services/ProjectCta";
import { Service, ServiceList } from "@/components/services/ServiceList";
import { Step, Steps } from "@/components/services/Steps";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { type Locale, locales } from "@/lib/i18n/config";
import { getSiteInfo } from "@/lib/site/get-site-info";

// The prose per language (ADR-012), compiled at build time like the About page's story.
const prose: Record<Locale, MDXContent> = { fa: ServicesFa, en: ServicesEn };

// Passed in rather than imported by the .mdx files (see the About page); content.test.ts checks fa and en match.
const proseComponents = { ServiceList, Service, Steps, Step };

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/services">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();

  await connection();
  const [site, t] = await Promise.all([
    getSiteInfo(),
    getTranslations({ locale, namespace: "services" }),
  ]);
  return { title: t("meta.title", { name: site.name[locale] }), description: t("lead") };
}

export default async function ServicesPage({ params }: PageProps<"/[locale]/services">) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);

  await connection();
  const t = await getTranslations({ locale, namespace: "services" });
  const Prose = prose[locale];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-16">
      <SectionHeader as="h1" eyebrow={t("eyebrow")} title={t("title")} description={t("lead")} />
      <div className="mt-12">
        <Prose components={proseComponents} />
      </div>
      <ProjectCta />
    </div>
  );
}
