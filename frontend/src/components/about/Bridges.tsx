import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

/** `<Bridges>` in content/about.*.mdx: the cards side by side from md. */
export function Bridges({ children }: { children: ReactNode }) {
  // role="list": Safari drops list semantics from a list without bullets.
  return (
    <ul role="list" className="mt-8 grid gap-4 md:grid-cols-3">
      {children}
    </ul>
  );
}

type BridgeProps = {
  /** The idea from electrical engineering. */
  from: string;
  /** What it became in software; the card's heading. */
  to: string;
  children: ReactNode;
};

/**
 * `<Bridge from="…" to="…">` — one idea that carried over from electrical engineering into software. The arrow
 * is drawn for the eye only; screen readers hear "In electrical engineering: …" and "In software: …" instead.
 */
export function Bridge({ from, to, children }: BridgeProps) {
  const t = useTranslations("about.bridge");

  return (
    <li>
      <Card className="h-full">
        <p className="text-sm font-medium text-accent">
          <span className="sr-only">{t("from")} </span>
          {from}
        </p>
        <h3 className="mt-2 flex items-center gap-2 text-lg font-bold">
          {/* Points toward the inline end: flipped in Persian, where the text runs right to left. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-4 shrink-0 text-muted rtl:-scale-x-100"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 8h12M10 4l4 4-4 4" />
          </svg>
          <span>
            <span className="sr-only">{t("to")} </span>
            {to}
          </span>
        </h3>
        <div className="mt-4">{children}</div>
      </Card>
    </li>
  );
}
