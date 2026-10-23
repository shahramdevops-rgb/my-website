import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

type Part = "challenge" | "decision" | "why";

/** One labelled part of a `<Decision>` card: the label comes from messages, so every language gets the same three. */
function DecisionPart({ part, children }: { part: Part; children: ReactNode }) {
  const t = useTranslations("decisions.parts");

  return (
    <div>
      <dt className="font-mono text-xs font-bold tracking-wide text-accent uppercase">{t(part)}</dt>
      <dd className="mt-2">{children}</dd>
    </div>
  );
}

// Three named components rather than one with a `part` prop: content.test.ts compares the components fa and en use,
// so a translation that drops or swaps a part fails the test.

/** `<Challenge>` — the problem or constraint the decision had to answer. */
export function Challenge({ children }: { children: ReactNode }) {
  return <DecisionPart part="challenge">{children}</DecisionPart>;
}

/** `<Choice>` — what was decided (labelled "Decision"; the card itself is the `<Decision>`). */
export function Choice({ children }: { children: ReactNode }) {
  return <DecisionPart part="decision">{children}</DecisionPart>;
}

/** `<Why>` — the reason, including the cost that was accepted. */
export function Why({ children }: { children: ReactNode }) {
  return <DecisionPart part="why">{children}</DecisionPart>;
}
