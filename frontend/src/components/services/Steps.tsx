import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

/**
 * `<Steps>` in content/services.*.mdx: the "how I work" steps, in order. An `<ol>`, so screen readers hear
 * "list, 4 items" and the order is part of the meaning, not only of the look.
 */
export function Steps({ children }: { children: ReactNode }) {
  return (
    <ol role="list" className="steps mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {children}
    </ol>
  );
}

type StepProps = {
  /** The step's name; the card's heading. */
  title: string;
  children: ReactNode;
};

/**
 * `<Step title="…">` — one step of the process. Its number comes from a CSS counter (globals.css, `.steps`), so
 * the content never numbers steps by hand and Persian gets Persian digits. The badge is decoration: the list
 * already tells screen readers the position.
 */
export function Step({ title, children }: StepProps) {
  return (
    <li className="step">
      <Card className="h-full">
        <span
          aria-hidden="true"
          className="step-number flex size-9 items-center justify-center rounded-full bg-accent-soft font-mono text-sm font-bold text-accent"
        />
        <h3 className="mt-4 text-lg font-bold">{title}</h3>
        <div className="mt-4">{children}</div>
      </Card>
    </li>
  );
}
