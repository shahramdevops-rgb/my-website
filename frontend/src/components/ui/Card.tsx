import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export type CardProps = {
  /** `article` for self-contained content (a post or project teaser), `section` for a titled part of a page. */
  as?: "div" | "article" | "section";
  /** The id of the card's heading: names a `section` card for screen readers (a labelled region). */
  labelledBy?: string;
  className?: string;
  children: ReactNode;
};

/** The site's basic surface: a hairline-bordered panel (ADR-024). */
export function Card({ as: Element = "div", labelledBy, className, children }: CardProps) {
  return (
    <Element
      aria-labelledby={labelledBy}
      className={cn("rounded-2xl border border-border bg-surface p-6", className)}
    >
      {children}
    </Element>
  );
}
