"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState } from "react";
import { type Keycap, keycapsIn } from "@/lib/keyboard/keycaps";
import { playKeySound } from "@/lib/sound/keyboard-sound";
import { cn } from "@/lib/ui/cn";
import { KeyboardPoster } from "./KeyboardPoster";
import { TechCard } from "./TechCard";
import { useSceneAllowed } from "./useSceneAllowed";

// Three.js and React Three Fiber are a separate chunk, fetched only when the scene is allowed — after hydration
// (useSceneAllowed is false on the server and during hydration). ssr: false: WebGL exists only in the browser.
const KeyboardScene = dynamic(
  () => import("./KeyboardScene").then((module) => module.KeyboardScene),
  { ssr: false },
);

export type KeyboardHeroLabels = {
  hint: string;
  /** Heading of the smaller list: the technologies also used. */
  alsoUsed: string;
  usedIn: string;
  noProjects: string;
};

type SceneState = "loading" | "ready" | "failed";

/** Typing in a form field elsewhere on the page must never press a keycap. */
function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/**
 * The keyboard hero (P3-T3, architecture.md §8.2). Three views of one state:
 * - the stage: the CSS poster, replaced by the lazy 3D scene where WebGL works and motion is welcome;
 * - a list of buttons, one per technology — the accessible equivalent, and the way in on touch screens;
 * - the glass card of the active technology.
 *
 * The real keys work while the pointer is over the keyboard or focus is in the list: single-letter shortcuts
 * that are always on would fire while someone dictates by voice or types elsewhere (WCAG 2.1.4).
 */
export function KeyboardHero({
  keycaps,
  labels,
}: {
  keycaps: Keycap[];
  labels: KeyboardHeroLabels;
}) {
  // Opened by a click, a tap or a real key; stays open until another key, the same button again, or Esc.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Under the pointer: opens its card while hovered, then the selected one shows again.
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Its real key is held down.
  const [heldId, setHeldId] = useState<string | null>(null);
  const [sceneState, setSceneState] = useState<SceneState>("loading");

  const sceneAllowed = useSceneAllowed();
  const showScene = sceneAllowed && sceneState !== "failed";

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardId = useId();

  const activeId = hoveredId ?? selectedId;
  const downId = heldId ?? hoveredId;
  const active = keycaps.find((keycap) => keycap.id === activeId);

  // The sound follows the keycaps on the stage: whenever the key that is down changes (pointer moved onto another
  // key, a real key pressed or released), the old one is released and the new one pressed. A ref, not state:
  // remembering which key sounded must not render again.
  const soundedDownId = useRef<string | null>(null);
  useEffect(() => {
    const previous = soundedDownId.current;
    if (previous === downId) return;
    if (previous) playKeySound("up", previous);
    if (downId) playKeySound("down", downId);
    soundedDownId.current = downId;
  }, [downId]);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    let pointerOverStage = false;
    const enterStage = () => (pointerOverStage = true);
    const leaveStage = () => (pointerOverStage = false);
    const inScope = () => pointerOverStage || root.contains(document.activeElement);

    const onKeyDown = (event: KeyboardEvent) => {
      // Ctrl+C and friends belong to the browser.
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (!inScope() || isEditable(event.target)) return;

      if (event.key === "Escape") {
        setSelectedId(null);
        return;
      }
      const keycap = keycaps.find(({ code }) => code === event.code);
      if (!keycap) return;
      event.preventDefault();
      // A held key repeats keydown; the keycap is already down.
      if (event.repeat) return;
      setHeldId(keycap.id);
      setSelectedId(keycap.id);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const released = keycaps.find(({ code }) => code === event.code);
      if (released) setHeldId((held) => (held === released.id ? null : held));
    };
    // Switching windows while a key is held: its keyup never reaches this page.
    const releaseAll = () => setHeldId(null);

    stage.addEventListener("pointerenter", enterStage);
    stage.addEventListener("pointerleave", leaveStage);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseAll);
    return () => {
      stage.removeEventListener("pointerenter", enterStage);
      stage.removeEventListener("pointerleave", leaveStage);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseAll);
    };
  }, [keycaps]);

  const toggle = (id: string) => setSelectedId((selected) => (selected === id ? null : id));

  const alsoKeycaps = keycapsIn(keycaps, "also");
  const alsoLabelId = useId();

  // One button per technology. The top row's are quieter (outlined, muted), like their keycaps.
  const techButton = (keycap: Keycap) => {
    const expanded = keycap.id === selectedId;
    const small = keycap.row === "also";
    return (
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={cardId}
        aria-keyshortcuts={keycap.key}
        onClick={() => pressButton(keycap.id)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full font-medium",
          small ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
          expanded
            ? "bg-accent text-bg"
            : small
              ? "border border-border text-muted hover:text-text"
              : "bg-accent-soft text-accent hover:shadow-[0_0_0_3px_var(--color-accent-soft)]",
        )}
      >
        <span dir="auto">{keycap.name}</span>
        {/* The key is announced by aria-keyshortcuts; read out again it would join the name ("C# C"). */}
        <kbd aria-hidden="true" className="text-xs">
          {keycap.key}
        </kbd>
      </button>
    );
  };

  // The list's buttons don't push a keycap down, so a click there plays a whole keystroke itself.
  const pressButton = (id: string) => {
    playKeySound("down", id);
    setTimeout(() => playKeySound("up", id), 70);
    toggle(id);
  };

  return (
    <div ref={rootRef} className="relative">
      {/*
        One box for poster and scene: its aspect ratio is fixed before any script runs, so the swap moves nothing.
        dir="ltr": a keyboard is a physical object with Latin legends, the same way round in both languages.
      */}
      <div
        ref={stageRef}
        dir="ltr"
        aria-hidden="true"
        data-testid="keyboard-stage"
        className="relative aspect-[16/10] overflow-hidden rounded-xl lg:aspect-[5/4]"
      >
        <KeyboardPoster
          keycaps={keycaps}
          activeId={activeId}
          downId={downId}
          onHover={setHoveredId}
          covered={showScene && sceneState === "ready"}
        />
        {showScene && (
          <KeyboardScene
            keycaps={keycaps}
            activeId={activeId}
            downId={downId}
            onHover={setHoveredId}
            onSelect={toggle}
            onReady={() => setSceneState("ready")}
            onFailed={() => setSceneState("failed")}
          />
        )}
      </div>

      <p className="mt-4 text-sm text-muted">{labels.hint}</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {keycapsIn(keycaps, "main").map((keycap) => (
          <li key={keycap.id}>{techButton(keycap)}</li>
        ))}
      </ul>
      {alsoKeycaps.length > 0 && (
        <>
          <p id={alsoLabelId} className="mt-4 text-xs text-muted">
            {labels.alsoUsed}
          </p>
          <ul aria-labelledby={alsoLabelId} className="mt-2 flex flex-wrap gap-1.5">
            {alsoKeycaps.map((keycap) => (
              <li key={keycap.id}>{techButton(keycap)}</li>
            ))}
          </ul>
        </>
      )}

      {/*
        The card comes after the buttons in the DOM, so a screen reader meets it right after the button it opened.
        From sm up it floats over the top of the stage (same box, so it can't change the card's height while
        hovering); on phones there is no room over the keyboard and it opens below the buttons.
        pointer-events-none: the pointer reaches the keys under the card.
      */}
      <div
        id={cardId}
        className="mt-4 sm:pointer-events-none sm:absolute sm:inset-x-0 sm:top-0 sm:mt-0 sm:aspect-[16/10] sm:p-3 lg:aspect-[5/4]"
      >
        {active && (
          <div className="sm:max-h-full sm:max-w-sm sm:overflow-hidden">
            <TechCard
              keycap={active}
              usedInLabel={labels.usedIn}
              noProjectsLabel={labels.noProjects}
            />
          </div>
        )}
      </div>
    </div>
  );
}
