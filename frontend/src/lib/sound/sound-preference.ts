// UI sound on/off (P3-T9): the mechanical-keyboard sound of the home page's keyboard. On by default — it only ever
// plays in answer to the visitor's own pointer or keys, never by itself. The choice lives in localStorage and is
// mirrored as data-sound="off" on <html> by the pre-paint script, so the mute icon is right before React runs
// (the same pattern as the theme, src/lib/theme/theme.ts).

export const soundStorageKey = "sound";

/** The attribute on <html>; present (with "off") only when muted. */
const attribute = "data-sound";

/** Fired on window when the choice changes in this tab; other tabs hear the `storage` event. */
const changeEvent = "soundchange";

/** Source of the pre-paint script's sound part (plain ES5, see themeScript). */
export const soundScript =
  `(function(){try{if(localStorage.getItem(${JSON.stringify(soundStorageKey)})==="off")` +
  `document.documentElement.setAttribute(${JSON.stringify(attribute)},"off")}catch(e){}})()`;

/** Whether the sound is on now. */
export function soundEnabled(): boolean {
  return document.documentElement.getAttribute(attribute) !== "off";
}

/** Turns the sound on or off, remembers it, and tells every subscriber. */
export function setSoundEnabled(enabled: boolean): void {
  if (enabled) document.documentElement.removeAttribute(attribute);
  else document.documentElement.setAttribute(attribute, "off");

  try {
    if (enabled) localStorage.removeItem(soundStorageKey);
    else localStorage.setItem(soundStorageKey, "off");
  } catch {
    // Storage blocked: the switch still works for this page view.
  }
  window.dispatchEvent(new Event(changeEvent));
}

/** Calls `onChange` when the choice changes, here or in another tab (for useSyncExternalStore). */
export function subscribeToSound(onChange: () => void): () => void {
  const fromOtherTab = (event: StorageEvent) => {
    if (event.key !== soundStorageKey) return;
    if (event.newValue === "off") document.documentElement.setAttribute(attribute, "off");
    else document.documentElement.removeAttribute(attribute);
    onChange();
  };

  window.addEventListener(changeEvent, onChange);
  window.addEventListener("storage", fromOtherTab);
  return () => {
    window.removeEventListener(changeEvent, onChange);
    window.removeEventListener("storage", fromOtherTab);
  };
}
