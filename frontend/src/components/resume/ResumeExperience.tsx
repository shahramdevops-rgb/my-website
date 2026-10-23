import { getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Tag } from "@/components/ui/Tag";
import type { Locale } from "@/lib/i18n/config";
import type { Resume } from "@/lib/resume/get-resume";
import { formatPeriod } from "./period";

type ResumeExperienceProps = Pick<Resume, "experience" | "techStack"> & { locale: Locale };

/**
 * The résumé's jobs, newest first as the API lists them. `tech` holds techStack ids (ADR-013); they show as the
 * technologies' localized names, the same names the keyboard hero uses.
 */
export async function ResumeExperience({ experience, techStack, locale }: ResumeExperienceProps) {
  if (experience.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "resume" });
  const period = {
    range: (start: string, end: string) => t("period.range", { start, end }),
    present: t("period.present"),
  };
  const techName = new Map(techStack.map((tech) => [tech.id, tech.name]));

  return (
    <section aria-labelledby="resume-experience" className="mt-14 print:mt-8">
      <SectionHeader id="resume-experience" title={t("experience.title")} />
      <ul role="list" className="mt-6 flex flex-col gap-10 print:gap-6">
        {experience.map((entry) => {
          const tech = entry.tech.flatMap((id) => techName.get(id) ?? []);
          return (
            <li
              key={`${entry.organization}-${entry.start}`}
              className="break-inside-avoid border-s border-border ps-6"
            >
              <h3 className="text-xl font-bold text-text">{entry.role}</h3>
              <p className="font-medium text-text">{entry.organization}</p>
              <p className="flex flex-wrap gap-x-4 text-sm text-muted">
                <span>{formatPeriod(entry.start, entry.end, locale, period)}</span>
                {entry.location && <span>{entry.location}</span>}
              </p>
              <p className="mt-3 text-text">{entry.summary}</p>
              {entry.highlights.length > 0 && (
                <ul className="mt-3 flex list-disc flex-col gap-1 ps-5 text-text marker:text-accent">
                  {entry.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              )}
              {tech.length > 0 && (
                <ul
                  role="list"
                  aria-label={t("experience.tech")}
                  className="mt-4 flex flex-wrap gap-2"
                >
                  {tech.map((name) => (
                    <li key={name}>
                      <Tag>{name}</Tag>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
