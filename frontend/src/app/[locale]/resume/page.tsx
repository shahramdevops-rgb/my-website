import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DownloadPdf } from "@/components/resume/DownloadPdf";
import { ResumeEducation } from "@/components/resume/ResumeEducation";
import { ResumeExperience } from "@/components/resume/ResumeExperience";
import { ResumeSkills } from "@/components/resume/ResumeSkills";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { locales } from "@/lib/i18n/config";
import { Link } from "@/lib/i18n/navigation";
import { getResume } from "@/lib/resume/get-resume";
import { getSiteInfo } from "@/lib/site/get-site-info";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/resume">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();

  await connection();
  const [site, resume, t] = await Promise.all([
    getSiteInfo(),
    getResume(locale),
    getTranslations({ locale, namespace: "resume" }),
  ]);
  return {
    title: t("meta.title", { name: site.name[locale] }),
    description: resume.basics.headline,
  };
}

/**
 * The résumé (ADR-013) as a page: one column that reads the same on screen and on paper (the print styles in
 * globals.css switch to the light palette; the site header, footer and the download button are hidden there).
 * Fetched once here; the sections get their part as props.
 */
export default async function ResumePage({ params }: PageProps<"/[locale]/resume">) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);

  await connection();
  const [resume, t] = await Promise.all([
    getResume(locale),
    getTranslations({ locale, namespace: "resume" }),
  ]);
  const { basics, links } = resume;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:py-16 print:max-w-none print:p-0">
      <header>
        <SectionHeader
          as="h1"
          eyebrow={t("eyebrow")}
          title={basics.name}
          description={basics.headline}
        />
        <p className="mt-6 max-w-2xl text-text">{basics.summary}</p>
        <p className="mt-2 text-sm text-muted">{t("location", { location: basics.location })}</p>
        {links.length > 0 && (
          <ul
            role="list"
            aria-label={t("links")}
            className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm"
          >
            {links.map((link) => (
              <li key={link.url}>
                <a href={link.url} rel="me" className="text-accent hover:underline">
                  {link.label}
                </a>
                {/* On paper a link can't be followed, so its address is printed after it. */}
                <span dir="ltr" className="hidden text-muted print:inline">
                  {" "}
                  {link.url}
                </span>
              </li>
            ))}
          </ul>
        )}
        <DownloadPdf locale={locale} />
      </header>

      <ResumeExperience
        experience={resume.experience}
        techStack={[...resume.techStack, ...resume.alsoUsed]}
        locale={locale}
      />
      <ResumeEducation education={resume.education} locale={locale} />
      <ResumeSkills skills={resume.skills} locale={locale} />

      {/* A pointer for employers to the reasoning behind the list (P3-T8). Not on paper: it can't be followed. */}
      <p className="mt-14 max-w-2xl text-muted print:hidden">
        {t.rich("decisions", {
          link: (chunks) => (
            <Link
              href="/decisions"
              className="font-medium text-accent underline underline-offset-4 hover:no-underline"
            >
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
