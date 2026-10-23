import { useTranslations } from "next-intl";
import { type ReactNode, useId } from "react";
import { Card } from "@/components/ui/Card";

/** `<DecisionList>` in content/decisions.*.mdx: the decision cards, two across from md. */
export function DecisionList({ children }: { children: ReactNode }) {
  // role="list": Safari drops list semantics from a list without bullets.
  return (
    <ul role="list" className="my-8 grid gap-4 md:grid-cols-2">
      {children}
    </ul>
  );
}

type DecisionProps = {
  /** The project the decision was made in ("This site", "Gym management system"). */
  project: string;
  /** The decision in a few words; the card's heading. */
  title: string;
  /** `<Challenge>`, `<Choice>` and `<Why>`, in that order. */
  children: ReactNode;
};

/**
 * `<Decision project="…" title="…">` — one engineering decision as a self-contained `article`, named by its
 * heading. Its three parts are a description list, so every part is labelled in words (Challenge / Decision /
 * Why) and the whole card reads top to bottom with no interaction: nothing is collapsed or hidden in tabs.
 */
export function Decision({ project, title, children }: DecisionProps) {
  const t = useTranslations("decisions");
  const headingId = useId();

  return (
    <li>
      <Card as="article" labelledBy={headingId} className="h-full">
        <p className="text-sm font-medium text-accent">
          <span className="sr-only">{t("project")} </span>
          {project}
        </p>
        <h2 id={headingId} className="mt-2 text-xl font-bold text-text">
          {title}
        </h2>
        <dl className="mt-6 flex flex-col gap-5">{children}</dl>
      </Card>
    </li>
  );
}
