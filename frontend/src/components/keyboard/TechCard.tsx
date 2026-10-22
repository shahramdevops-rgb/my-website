import type { Keycap } from "@/lib/keyboard/keycaps";

type TechCardProps = {
  keycap: Keycap;
  usedInLabel: string;
  noProjectsLabel: string;
};

/**
 * The glass card a keycap opens: what the technology is and where the résumé used it (P6 links real projects).
 * Translucent with a blur, so the keyboard stays visible behind it; the surface is opaque enough that text keeps
 * the contrast of text on `surface` (contrast.test.ts).
 */
export function TechCard({ keycap, usedInLabel, noProjectsLabel }: TechCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface/90 p-4 shadow-lg backdrop-blur-md">
      {/* <bdi>: "C#" keeps its order on a Persian page, while the heading still aligns with the page. */}
      <h3 className="text-lg font-bold">
        <bdi>{keycap.name}</bdi>
      </h3>
      <p className="mt-1 text-sm">{keycap.description}</p>
      <p className="mt-3 text-xs font-medium text-muted">{usedInLabel}</p>
      {keycap.usedIn.length > 0 ? (
        <ul className="mt-1 space-y-0.5 text-sm">
          {keycap.usedIn.map((entry, index) => (
            // The résumé may list the same organization twice (two roles); the position tells them apart.
            <li key={`${entry.organization}-${index}`} className="flex flex-wrap gap-x-2">
              <span className="font-medium">{entry.organization}</span>
              <span className="text-muted">{entry.role}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-muted">{noProjectsLabel}</p>
      )}
    </div>
  );
}
