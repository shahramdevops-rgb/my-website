import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export type CardProps = {
  /** `article` for self-contained content (a post or project teaser), `section` for a titled part of a page. */
  as?: "div" | "article" | "section";
  className?: string;
  children: ReactNode;
};

/** The site's basic surface: a hairline-bordered panel (ADR-024). */
export function Card({ as: Element = "div", className, children }: CardProps) {
  return (
    <Element className={cn("rounded-2xl border border-border bg-surface p-6", className)}>
      {children}
    </Element>
  );
}
