import type { PointerEvent } from "react";
import { type Keycap, keyboardLayout } from "@/lib/keyboard/keycaps";
import { cn } from "@/lib/ui/cn";
import { categoryColors } from "./category-colors";
import { type Ripple, rippleDelayMs } from "./ripple";

type KeyboardPosterProps = {
  keycaps: Keycap[];
  /** The keycap whose card is open: its legend lights up. */
  activeId: string | null;
  /** The keycap that is pushed down (hovered, or its real key held). */
  downId: string | null;
  onHover: (id: string | null) => void;
  /** The last press's light ripple, if any. */
  ripple: Ripple | null;
  /** Set once the 3D scene is on screen: the poster stays underneath, out of the pointer's way. */
  covered: boolean;
};

/**
 * The keyboard drawn with HTML and CSS: the first paint, the stand-in while the 3D scene loads, and the keyboard
 * itself for reduced motion or without WebGL. Same box as the scene, same keycaps in the same rows, tilted with a
 * CSS perspective so the swap reads as the picture coming alive rather than being replaced.
 * Decorative (aria-hidden): the list of buttons next to it is what assistive technology uses.
 */
export function KeyboardPoster({
  keycaps,
  activeId,
  downId,
  onHover,
  ripple,
  covered,
}: KeyboardPosterProps) {
  const layout = keyboardLayout(keycaps);

  // A touch has no "over": a tap would leave the key pushed down. Taps go through the list of buttons instead.
  const hover = (id: string | null) => (event: PointerEvent) => {
    if (event.pointerType !== "touch") onHover(id);
  };
  const origin = ripple && keycaps.find(({ id }) => id === ripple.id);
  const keyState = (keycap: Keycap) => ({
    active: keycap.id === activeId,
    down: keycap.id === downId,
    light:
      ripple && origin
        ? {
            seq: ripple.seq,
            color: categoryColors[origin.category].mark,
            delayMs: rippleDelayMs(keycaps, origin, keycap),
            origin: keycap.id === origin.id,
          }
        : null,
    onEnter: hover(keycap.id),
    onLeave: hover(null),
  });

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
      <div className="w-full origin-bottom rounded-2xl border border-border bg-surface-2 p-[3%] [transform:perspective(60rem)_rotateX(25deg)]">
        {/*
          One row per category. Each key sits in a slot as wide as its share of the plate; the slot's padding is the
          gap (a percentage of the row's width, so it scales with the keyboard). Every keycap is as tall as a main
          one, so a row's narrower "also" keys line up with its big ones.
        */}
        {layout.rows.map(({ category, keys }) => (
          <div key={category} className="flex">
            {keys.map(({ keycap, width }) => (
              <div
                key={keycap.id}
                className="p-[1.2%]"
                style={{ width: `${(width / layout.width) * 100}%` }}
              >
                <PosterKey
                  keycap={keycap}
                  {...keyState(keycap)}
                  aspectRatio={keyAspect(width, layout.width)}
                  small={keycap.row === "also"}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The slots' padding on each side, in % of the row's width (the p-[1.2%] above). */
const slotPadding = 1.2;

/** A keycap's width : height, so that a key `width` main keys wide is as tall as a main 8:5 keycap. */
function keyAspect(width: number, plateWidth: number): string {
  const inner = (keys: number) => (keys / plateWidth) * 100 - 2 * slotPadding;
  return `${inner(width)} / ${(inner(1) * 5) / 8}`;
}

type PosterKeyProps = {
  keycap: Keycap;
  /** CSS aspect-ratio of the keycap (keyAspect). */
  aspectRatio: string;
  active: boolean;
  down: boolean;
  onEnter: (event: PointerEvent) => void;
  onLeave: (event: PointerEvent) => void;
  /** The light ripple passing over this key: when it arrives, in which color, and whether it started here. */
  light: { seq: number; color: string; delayMs: number; origin: boolean } | null;
  /** The "also used" keys: narrower and set lighter, so the main stack leads its row. */
  small?: boolean;
};

function PosterKey({
  keycap,
  aspectRatio,
  active,
  down,
  onEnter,
  onLeave,
  light,
  small = false,
}: PosterKeyProps) {
  return (
    <div
      style={{ aspectRatio }}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      className={cn(
        // Container queries: the legend scales with its keycap, at every grid width.
        // The body takes its category's tint, like a keycap set's colorway (P3-T12).
        "@container relative flex items-center justify-center rounded-lg border",
        categoryColors[keycap.category].body,
        "shadow-[0_0.3rem_0_var(--color-border)] motion-safe:transition-[translate,box-shadow] motion-safe:duration-100",
        active ? "border-accent text-accent" : "border-border text-text",
        down && "translate-y-[0.3rem] shadow-none",
      )}
    >
      {/*
        The light, under the legends. A new press (seq) mounts a new element, which restarts the animation.
        Reduced motion: no wave — only the pressed key lights.
      */}
      {light && (
        <span
          key={light.seq}
          data-ripple={light.origin ? "origin" : "wave"}
          className={cn(
            "absolute inset-0 animate-key-ripple rounded-[inherit]",
            light.color,
            !light.origin && "motion-reduce:hidden",
          )}
          style={{ animationDelay: `${light.delayMs}ms` }}
        />
      )}
      <span className="absolute start-[7%] top-[6%] font-mono text-[10cqw] text-muted">
        {keycap.key}
      </span>
      {/* A narrower keycap gets a larger share of its width, so its name is nearly as big as a main key's. */}
      <span
        className={cn(
          "relative",
          small ? "text-[14cqw] font-medium" : "text-[12cqw] font-semibold",
        )}
      >
        {keycap.name}
      </span>
    </div>
  );
}
