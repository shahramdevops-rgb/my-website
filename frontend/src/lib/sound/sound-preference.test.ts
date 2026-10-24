import { afterEach, describe, expect, it, vi } from "vitest";
import { setSoundEnabled, soundEnabled, soundScript, subscribeToSound } from "./sound-preference";

describe("sound preference", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-sound");
  });

  it("is on by default", () => {
    expect(soundEnabled()).toBe(true);
  });

  it("remembers muting and tells subscribers", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToSound(onChange);

    setSoundEnabled(false);

    expect(soundEnabled()).toBe(false);
    expect(localStorage.getItem("sound")).toBe("off");
    expect(document.documentElement.dataset.sound).toBe("off");
    expect(onChange).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it("forgets the choice when switched back on, so the default applies again", () => {
    setSoundEnabled(false);
    setSoundEnabled(true);

    expect(soundEnabled()).toBe(true);
    expect(localStorage.getItem("sound")).toBeNull();
  });

  it("the pre-paint script restores a saved mute before React runs", () => {
    localStorage.setItem("sound", "off");

    new Function(soundScript)();

    expect(document.documentElement.dataset.sound).toBe("off");
  });
});
