import { afterEach, describe, expect, it, vi } from "vitest";
import { currentTheme, switchTheme, themeScript, themeStorageKey } from "./theme";

const root = document.documentElement;

/** Runs the pre-paint script the way the browser does: as plain code, with nothing imported. */
function runThemeScript() {
  new Function(themeScript)();
}

afterEach(() => {
  root.removeAttribute("data-theme");
  root.className = "";
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("themeScript", () => {
  it("applies a saved light theme", () => {
    localStorage.setItem(themeStorageKey, "light");

    runThemeScript();

    expect(root.dataset.theme).toBe("light");
  });

  it("leaves the page dark when nothing is saved", () => {
    runThemeScript();

    expect(root.hasAttribute("data-theme")).toBe(false);
    expect(currentTheme()).toBe("dark");
  });

  it("ignores a value that is not a theme", () => {
    localStorage.setItem(themeStorageKey, '"><img src=x>');

    runThemeScript();

    expect(root.hasAttribute("data-theme")).toBe(false);
  });

  it("does not throw when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    expect(runThemeScript).not.toThrow();
  });
});

describe("switchTheme", () => {
  it("shows and saves the new theme", () => {
    switchTheme("light");

    expect(currentTheme()).toBe("light");
    expect(localStorage.getItem(themeStorageKey)).toBe("light");
  });

  it("fades colors only for a moment", () => {
    vi.useFakeTimers();

    switchTheme("light");
    expect(root.classList.contains("theme-transition")).toBe(true);
    vi.runAllTimers();

    expect(root.classList.contains("theme-transition")).toBe(false);
    vi.useRealTimers();
  });
});
