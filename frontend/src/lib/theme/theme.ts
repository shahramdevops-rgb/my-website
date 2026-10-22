// Color theme (architecture.md §8): data-theme="dark|light" on <html>; no attribute means dark, the default.
// The visitor's choice lives in localStorage and is applied by the pre-paint script before the first paint.

export const themes = ["dark", "light"] as const;

export type Theme = (typeof themes)[number];

export const defaultTheme: Theme = "dark";

/** localStorage key of the saved choice. */
export const themeStorageKey = "theme";

/** How long the color fade runs while switching (matches .theme-transition in globals.css). */
const fadeMilliseconds = 250;

export function isTheme(value: unknown): value is Theme {
  return themes.some((theme) => theme === value);
}

/**
 * Source of the inline script in <head> (ThemeScript). It runs while the browser parses the HTML, before anything
 * is painted, so a saved light theme never flashes dark first. Plain ES5 and self-contained: it runs before any
 * bundle has loaded. try/catch: localStorage throws when storage is blocked; the page then simply stays dark.
 */
export const themeScript =
  `(function(){try{var t=localStorage.getItem(${JSON.stringify(themeStorageKey)});` +
  `if(${JSON.stringify(themes)}.indexOf(t)>=0)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

/** The theme the page shows now. */
export function currentTheme(): Theme {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : defaultTheme;
}

/** The saved choice, if any. */
export function savedTheme(): Theme | undefined {
  try {
    const value = localStorage.getItem(themeStorageKey);
    return isTheme(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

let fadeTimer: ReturnType<typeof setTimeout> | undefined;

/** Shows `theme` (with a short color fade, which CSS drops for reduced motion) and remembers it. */
export function switchTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.add("theme-transition");
  clearTimeout(fadeTimer);
  fadeTimer = setTimeout(() => root.classList.remove("theme-transition"), fadeMilliseconds);

  root.dataset.theme = theme;
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Storage blocked: the switch still works for this page view.
  }
}

/** Calls `onChange` whenever data-theme on <html> changes (for useSyncExternalStore). */
export function subscribeToTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
