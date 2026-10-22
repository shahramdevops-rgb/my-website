import { getLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Tag } from "@/components/ui/Tag";
import { getResume } from "@/lib/resume/get-resume";

/**
 * `<Skills />` in content/about.*.mdx: the résumé's skill groups (ADR-013) as a grid of cards. The same request's
 * other parts reuse the résumé fetched for the timeline (getResume is cached per request).
 */
export async function Skills() {
  const locale = await getLocale();
  const [resume, t] = await Promise.all([
    getResume(locale),
    getTranslations({ locale, namespace: "about.skills" }),
  ]);

  return (
    <section aria-labelledby="about-skills">
      <SectionHeader
        id="about-skills"
        title={t("title")}
        description={t("description")}
        className="mt-16"
      />
      <ul role="list" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {resume.skills.map((group) => (
          <li key={group.category}>
            <Card className="h-full">
              <h3 className="text-lg font-bold">{group.category}</h3>
              <ul role="list" className="mt-4 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <li key={item}>
                    <Tag>{item}</Tag>
                  </li>
                ))}
              </ul>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
