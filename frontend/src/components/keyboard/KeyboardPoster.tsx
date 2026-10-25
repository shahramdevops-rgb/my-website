import type { PointerEvent } from "react";
import { type Keycap, keyboardLayout, keycapsIn } from "@/lib/keyboard/keycaps";
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
 * itself for reduced motion or without WebGL. Same box as the scene, same keycaps in the same grid, tilted with a
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
  const main = keycapsIn(keycaps, "main");
  const also = keycapsIn(keycaps, "also");
  const { columns } = keyboardLayout(main.length);

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
        {/* What was also used: the main grid's columns (so the names are as readable), shorter keys — like a
            keyboard's function row above the letters. */}
        {also.length > 0 && (
          <div
            className="mb-[3%] grid gap-[3%]"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {also.map((keycap) => (
              <PosterKey key={keycap.id} keycap={keycap} {...keyState(keycap)} small />
            ))}
          </div>
        )}
        <div
          className="grid gap-[3%]"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {main.map((keycap) => (
            <PosterKey key={keycap.id} keycap={keycap} {...keyState(keycap)} />
          ))}
        </div>
      </div>
    </div>
  );
}

type PosterKeyProps = {
  keycap: Keycap;
  active: boolean;
  down: boolean;
  onEnter: (event: PointerEvent) => void;
  onLeave: (event: PointerEvent) => void;
  /** The light ripple passing over this key: when it arrives, in which color, and whether it started here. */
  light: { seq: number; color: string; delayMs: number; origin: boolean } | null;
  /** The "also used" keys: as wide as the main ones but shorter, so the main stack leads. */
  small?: boolean;
};

function PosterKey({
  keycap,
  active,
  down,
  onEnter,
  onLeave,
  light,
  small = false,
}: PosterKeyProps) {
  return (
    <div
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      className={cn(
        // Container queries: the legend scales with its keycap, at every grid width.
        // The body takes its category's tint, like a keycap set's colorway (P3-T12).
        "@container relative flex items-center justify-center rounded-lg border",
        categoryColors[keycap.category].body,
        "shadow-[0_0.3rem_0_var(--color-border)] motion-safe:transition-[translate,box-shadow] motion-safe:duration-100",
        small ? "aspect-[8/3.5]" : "aspect-[8/5]",
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
      <span className="absolute start-[7%] top-[6%] font-mono text-[11cqw] text-muted">
        {keycap.key}
      </span>
      <span
        className={cn("relative text-[12cqw]", small ? "mt-[6%] font-medium" : "font-semibold")}
      >
        {keycap.name}
      </span>
    </div>
  );
}
