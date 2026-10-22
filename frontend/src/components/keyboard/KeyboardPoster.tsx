import type { PointerEvent } from "react";
import { type Keycap, keyboardLayout } from "@/lib/keyboard/keycaps";
import { cn } from "@/lib/ui/cn";

type KeyboardPosterProps = {
  keycaps: Keycap[];
  /** The keycap whose card is open: its legend lights up. */
  activeId: string | null;
  /** The keycap that is pushed down (hovered, or its real key held). */
  downId: string | null;
  onHover: (id: string | null) => void;
  /** Set once the 3D scene is on screen: the poster stays underneath, out of the pointer's way. */
  covered: boolean;
};

/**
 * The keyboard drawn with HTML and CSS: the first paint, the stand-in while the 3D scene loads, and the keyboard
 * itself for reduced motion or without WebGL. Same box as the scene, same keycaps in the same grid, tilted with a
 * CSS perspective so the swap reads as the picture coming alive rather than being replaced.
 * Decorative (aria-hidden): the list of buttons next to it is what assistive technology uses.
 */
export function KeyboardPoster({
  keycaps,
  activeId,
  downId,
  onHover,
  covered,
}: KeyboardPosterProps) {
  const { columns } = keyboardLayout(keycaps.length);

  // A touch has no "over": a tap would leave the key pushed down. Taps go through the list of buttons instead.
  const hover = (id: string | null) => (event: PointerEvent) => {
    if (event.pointerType !== "touch") onHover(id);
  };

  return (
    <div
      aria-hidden="true"
      data-testid="keyboard-poster"
      className={cn(
        "absolute inset-0 flex items-end justify-center px-[6%] pb-[7%]",
        "motion-safe:transition-opacity motion-safe:duration-500",
        covered && "pointer-events-none opacity-0",
      )}
    >
      <div className="w-full origin-bottom rounded-2xl border border-border bg-surface-2 p-[3%] [transform:perspective(60rem)_rotateX(32deg)]">
        <div
          className="grid gap-[3%]"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {keycaps.map((keycap) => (
            <div
              key={keycap.id}
              onPointerEnter={hover(keycap.id)}
              onPointerLeave={hover(null)}
              className={cn(
                // Container queries: the legend scales with its keycap, at every grid width.
                "@container relative flex aspect-[8/5] items-center justify-center rounded-lg border bg-surface",
                "shadow-[0_0.3rem_0_var(--color-border)] motion-safe:transition-[translate,box-shadow] motion-safe:duration-100",
                keycap.id === activeId ? "border-accent text-accent" : "border-border text-text",
                keycap.id === downId && "translate-y-[0.3rem] shadow-none",
              )}
            >
              <span className="absolute start-[7%] top-[6%] font-mono text-[11cqw] text-muted">
                {keycap.key}
              </span>
              <span className="text-[12cqw] font-semibold">{keycap.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
