import { getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Tag } from "@/components/ui/Tag";
import type { Locale } from "@/lib/i18n/config";
import type { Resume } from "@/lib/resume/get-resume";

type ResumeSkillsProps = Pick<Resume, "skills"> & { locale: Locale };

/**
 * The résumé's skill groups: category beside its items from `sm`, stacked on phones. Plain rows rather than About's
 * cards, so the page stays one calm column and prints compactly.
 */
export async function ResumeSkills({ skills, locale }: ResumeSkillsProps) {
  if (skills.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "resume" });

  return (
    <section aria-labelledby="resume-skills" className="mt-14 print:mt-8">
      <SectionHeader id="resume-skills" title={t("skills.title")} />
      <ul role="list" className="mt-6 flex flex-col gap-5 print:gap-3">
        {skills.map((group) => (
          <li
            key={group.category}
            className="grid break-inside-avoid gap-2 sm:grid-cols-[11rem_1fr] sm:gap-6"
          >
            <h3 className="font-bold text-text">{group.category}</h3>
            <ul role="list" className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <li key={item}>
                  <Tag>{item}</Tag>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
