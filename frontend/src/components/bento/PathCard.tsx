import type { ReactNode } from "react";
import { BentoCard } from "@/components/ui/BentoCard";

type PathCardProps = {
  /** Id of the card's heading; also names the card for screen readers. */
  id: string;
  /** The reader's question ("Hiring?"), so each visitor finds their path at a glance (ADR-019). */
  eyebrow: string;
  title: string;
  body: string;
  /** The path's next steps: ButtonLinks, the main one first. */
  children: ReactNode;
};

/** One of the two audience paths on the home page: employers → résumé, clients → services and contact. */
export function PathCard({ id, eyebrow, title, body, children }: PathCardProps) {
  return (
    <BentoCard as="section" labelledBy={id} columns={2} className="flex flex-col">
      <p className="text-sm font-medium text-accent">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-2xl font-bold">
        {title}
      </h2>
      <p className="mt-2 text-muted">{body}</p>
      {/* mt-auto: the buttons sit on the card's bottom edge, level across both cards whatever the text length. */}
      <div className="mt-auto flex flex-wrap gap-3 pt-6">{children}</div>
    </BentoCard>
  );
}
