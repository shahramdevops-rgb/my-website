import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

type SectionHeaderProps = {
  title: ReactNode;
  /** Small line above the title (a category, a step number). */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Usually a ButtonLink ("All posts"); sits at the end of the title row from md. */
  action?: ReactNode;
  /** The heading level that fits the page outline; the look stays the same. */
  as?: "h1" | "h2" | "h3";
  /** Lets the section point at its heading: <section aria-labelledby={id}>. */
  id?: string;
  className?: string;
};

/** The heading block that opens a page section. */
export function SectionHeader({
  title,
  eyebrow,
  description,
  action,
  as: Heading = "h2",
  id,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}
    >
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-2 text-sm font-medium text-accent">{eyebrow}</p>}
        <Heading id={id} className="text-3xl font-bold text-text">
          {title}
        </Heading>
        {description && <p className="mt-3 text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
