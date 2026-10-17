// Theme store ($store.theme): the current theme and switching it. The inline head script (InlineScripts.cs)
// has already applied the saved choice before first paint, so the store starts from data-theme on <html>.
const storageKey = "theme"; // same key as the head script
const root = document.documentElement;

export default {
  current: root.dataset.theme === "light" ? "light" : "dark",

  get isLight() {
    return this.current === "light";
  },

  toggle() {
    this.current = this.isLight ? "dark" : "light";

    // Colors fade only while switching (app.css, motion-safe): a permanent transition on every element
    // would also slow down hovers and fade colors in on every page load.
    root.classList.add("theme-transition");
    root.dataset.theme = this.current;
    setTimeout(() => root.classList.remove("theme-transition"), 300);

    try {
      localStorage.setItem(storageKey, this.current);
    } catch {
      // Storage blocked: the choice lasts until the next page load.
    }
  },
};
