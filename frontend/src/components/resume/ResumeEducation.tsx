import { getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { Locale } from "@/lib/i18n/config";
import type { Resume } from "@/lib/resume/get-resume";
import { formatPeriod } from "./period";

type ResumeEducationProps = Pick<Resume, "education"> & { locale: Locale };

/** The résumé's degrees, newest first. The title reads like About's timeline ("MSc in Electrical Engineering"). */
export async function ResumeEducation({ education, locale }: ResumeEducationProps) {
  if (education.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "resume" });
  const period = {
    range: (start: string, end: string) => t("period.range", { start, end }),
    present: t("period.present"),
  };

  return (
    <section aria-labelledby="resume-education" className="mt-14 print:mt-8">
      <SectionHeader id="resume-education" title={t("education.title")} />
      <ul role="list" className="mt-6 flex flex-col gap-6 print:gap-4">
        {education.map((entry) => (
          <li
            key={`${entry.degree}-${entry.institution}`}
            className="break-inside-avoid border-s border-border ps-6"
          >
            <h3 className="text-lg font-bold text-text">
              {t("education.degree", { degree: entry.degree, field: entry.field })}
            </h3>
            <p className="text-text">{entry.institution}</p>
            <p className="text-sm text-muted">
              {formatPeriod(entry.start, entry.end, locale, period)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
