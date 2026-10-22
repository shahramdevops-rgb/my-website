import type { ReactNode } from "react";

/**
 * A label for a topic or technology (blog tags, a project's stack). dir="auto" takes the direction from the tag's
 * own first letter: on a Persian page "C#" and ".NET" would otherwise show as "#C" and "NET.", because "#" and "."
 * have no direction of their own and follow the page's RTL.
 */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span
      dir="auto"
      className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent"
    >
      {children}
    </span>
  );
}
