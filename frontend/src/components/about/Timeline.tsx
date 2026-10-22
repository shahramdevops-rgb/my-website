import { getLocale, getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getResume, type Resume } from "@/lib/resume/get-resume";
import { cn } from "@/lib/ui/cn";

type Step = { key: string; title: string; detail: string; current: boolean };

/**
 * The story's steps, oldest first: the résumé's education (listed newest first, like any résumé) and then today's
 * work. The degrees come from the résumé (ADR-013), so About and the Resume page can't disagree.
 */
export function timelineSteps(
  education: Resume["education"],
  degreeTitle: (degree: string, field: string) => string,
  now: { title: string; body: string },
): Step[] {
  const past = [...education].reverse().map((entry) => ({
    key: `${entry.degree}-${entry.institution}`,
    title: degreeTitle(entry.degree, entry.field),
    detail: entry.institution,
    current: false,
  }));

  return [...past, { key: "now", title: now.title, detail: now.body, current: true }];
}

/** `<Timeline />` in content/about.*.mdx: "From circuits to cloud" as an ordered list of steps. */
export async function Timeline() {
  const locale = await getLocale();
  const [resume, t] = await Promise.all([
    getResume(locale),
    getTranslations({ locale, namespace: "about.timeline" }),
  ]);
  const steps = timelineSteps(resume.education, (degree, field) => t("degree", { degree, field }), {
    title: t("now.title"),
    body: t("now.body"),
  });

  return (
    <section aria-labelledby="about-timeline">
      <SectionHeader id="about-timeline" title={t("title")} className="mt-16" />
      {/* The line runs along the inline-start edge: on the right in Persian, on the left in English. */}
      <ol className="mt-8 max-w-3xl border-s border-border">
        {steps.map((step) => (
          <li key={step.key} className="relative ps-8 pb-8 last:pb-0">
            <span
              aria-hidden="true"
              className={cn(
                "absolute -start-1.5 top-2 size-3 rounded-full border-2 border-bg",
                step.current ? "bg-accent" : "bg-muted",
              )}
            />
            <h3 className={cn("text-lg font-bold", step.current ? "text-accent" : "text-text")}>
              {step.title}
            </h3>
            <p className="mt-1 text-muted">{step.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
