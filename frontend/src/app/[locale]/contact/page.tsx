import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactLinks } from "@/components/contact/ContactLinks";
import { FormPlaceholder } from "@/components/contact/FormPlaceholder";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { parseContactRequestType } from "@/lib/contact/request-type";
import { locales } from "@/lib/i18n/config";
import { getSiteInfo } from "@/lib/site/get-site-info";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();

  await connection();
  const [site, t] = await Promise.all([
    getSiteInfo(),
    getTranslations({ locale, namespace: "contact" }),
  ]);
  return { title: t("meta.title", { name: site.name[locale] }), description: t("lead.general") };
}

/**
 * Contact (P3-T7): the configured links as cards and a placeholder for the P9 form. `?type=hiring|project` (from
 * the home page's paths and the Services CTA) picks the intro line; any other value gets the general one.
 */
export default async function ContactPage({
  params,
  searchParams,
}: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);

  await connection();
  const [site, t, query] = await Promise.all([
    getSiteInfo(),
    getTranslations({ locale, namespace: "contact" }),
    searchParams,
  ]);
  const type = parseContactRequestType(query.type);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:py-16">
      <SectionHeader
        as="h1"
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t(`lead.${type ?? "general"}`)}
      />
      <ContactLinks locale={locale} social={site.social} />
      <FormPlaceholder locale={locale} />
    </div>
  );
}
