"use client";

import { useSyncExternalStore } from "react";
import { setSoundEnabled, soundEnabled, subscribeToSound } from "@/lib/sound/sound-preference";

/**
 * Keyboard-sound switch next to the language switcher: a toggle button ("Keyboard sound", aria-pressed = on), like
 * ThemeToggle. The icon comes from CSS (data-sound on <html>, set before the first paint), so a muted visitor never
 * sees the speaker flash on; aria-pressed is corrected right after hydration.
 */
export function SoundToggle({ label }: { label: string }) {
  const enabled = useSyncExternalStore(subscribeToSound, soundEnabled, () => true);

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={enabled}
      onClick={() => setSoundEnabled(!enabled)}
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text hover:bg-surface-2"
    >
      <SpeakerIcon className="size-5 sound-off:hidden" />
      <MutedIcon className="hidden size-5 sound-off:block" />
    </button>
  );
}

const iconProps = {
  viewBox: "0 0 24 24",
  "aria-hidden": true,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function SpeakerIcon({ className }: { className: string }) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function MutedIcon({ className }: { className: string }) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="m16 9 6 6M22 9l-6 6" />
    </svg>
  );
}
