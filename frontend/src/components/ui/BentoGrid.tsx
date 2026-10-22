"use client";

import { type ReactNode, useEffect, useRef, useSyncExternalStore } from "react";
import { cn } from "@/lib/ui/cn";

/**
 * Where the spotlight runs: a mouse-like pointer that can hover, and a visitor who hasn't asked for less motion.
 * On touch screens there is no cursor to follow; with reduced motion a glow that chases the cursor is motion.
 */
export const spotlightMediaQuery =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

function subscribeToSpotlight(onChange: () => void) {
  const query = window.matchMedia(spotlightMediaQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const spotlightAllowed = () => window.matchMedia(spotlightMediaQuery).matches;

/**
 * The Bento layout (ADR-024): 1 column on phones, 2 from md, 4 from lg. Children are BentoCards, rendered on the
 * server; this component only adds the cursor spotlight (architecture.md §8.2).
 *
 * One pointer listener on the grid writes the cursor position into --x/--y on every card, relative to that card,
 * so cards next to the cursor light up at the near edge too. It writes through the CSSOM (element.style), which
 * CSP never blocks, at most once per frame. Off on touch and with reduced motion: no listener, and no
 * data-spotlight attribute for the CSS glow to match.
 */
export function BentoGrid({ className, children }: { className?: string; children: ReactNode }) {
  const gridRef = useRef<HTMLDivElement>(null);
  // The server can't know the visitor's device: it renders "off", and the browser switches it on after hydration.
  const enabled = useSyncExternalStore(subscribeToSpotlight, spotlightAllowed, () => false);

  useEffect(() => {
    const grid = gridRef.current;
    if (!enabled || !grid) return;

    let frame = 0;
    let pointer = { x: 0, y: 0 };

    // Arrow functions, not `function` declarations: those are hoisted, so TypeScript forgets that grid isn't null.
    const moveSpotlight = () => {
      frame = 0;
      for (const card of grid.querySelectorAll<HTMLElement>(".bento-card")) {
        // Physical coordinates on purpose: the cursor has a place on screen, not a reading direction.
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--x", `${pointer.x - rect.left}px`);
        card.style.setProperty("--y", `${pointer.y - rect.top}px`);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      // A touch-capable laptop can still send touch pointers while its trackpad allows the spotlight.
      if (event.pointerType === "touch") return;
      pointer = { x: event.clientX, y: event.clientY };
      // Pointer events fire faster than the screen repaints; the layout reads wait for the next frame.
      frame ||= requestAnimationFrame(moveSpotlight);
    };

    grid.addEventListener("pointermove", onPointerMove);
    return () => {
      grid.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(frame);
    };
  }, [enabled]);

  return (
    <div
      ref={gridRef}
      data-spotlight={enabled ? "" : undefined}
      className={cn(
        "grid auto-rows-[minmax(11rem,auto)] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
