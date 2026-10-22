"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import {
  currentTheme,
  defaultTheme,
  savedTheme,
  subscribeToTheme,
  switchTheme,
} from "@/lib/theme/theme";

/**
 * Dark-theme switch: a toggle button whose label stays the same ("Dark theme") while aria-pressed says whether it
 * is on. The icon is chosen by CSS from data-theme, so it is right from the first paint, before React runs.
 */
export function ThemeToggle({ label }: { label: string }) {
  // The <html> attribute is the single source of truth. The server can't know it, so it renders the default and
  // React corrects aria-pressed right after hydration (no mismatch error).
  const theme = useSyncExternalStore(subscribeToTheme, currentTheme, () => defaultTheme);

  // Development only: Strict Mode's remount resets <html> attributes and drops the one the pre-paint script set.
  // In production this re-applies the value that is already there.
  useLayoutEffect(() => {
    const saved = savedTheme();
    if (saved) document.documentElement.dataset.theme = saved;
  }, []);

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={theme === "dark"}
      onClick={() => switchTheme(theme === "dark" ? "light" : "dark")}
      className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-text hover:bg-surface-2"
    >
      <MoonIcon className="size-5 light:hidden" />
      <SunIcon className="size-5 dark:hidden" />
    </button>
  );
}

function MoonIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function SunIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
