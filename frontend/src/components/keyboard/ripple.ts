import { type Keycap, keyDistance } from "@/lib/keyboard/keycaps";

/**
 * The light ripple (P3-T14): like a real RGB keyboard's reactive effect, a press sends a wave of light outward from
 * the pressed key in its category's color. Shared by the poster (CSS animation) and the 3D scene (emissive pulse).
 */
export type Ripple = {
  /** Counts presses: a new number restarts the wave, even from the same key. */
  seq: number;
  /** The pressed keycap. */
  id: string;
};

/** How long the wave takes to travel one key. */
export const rippleStepMs = 60;
/** How long each key stays lit (it flares, then fades). The whole wave is over in about 600 ms. */
export const rippleLightMs = 350;
/** Brightest share of the light, at the top of a key's flare. */
export const ripplePeak = 0.45;

/** When the wave reaches `keycap`, in ms after the press. */
export function rippleDelayMs(keycaps: Keycap[], origin: Keycap, keycap: Keycap): number {
  return keyDistance(keycaps, origin, keycap) * rippleStepMs;
}

/**
 * A key's light `ms` after the wave reached it: a fast rise (first quarter) and a slower fade, 0 before and after.
 * The same curve as the `key-ripple` keyframes in globals.css.
 */
export function rippleLevel(ms: number): number {
  if (ms <= 0 || ms >= rippleLightMs) return 0;
  const rise = rippleLightMs * 0.25;
  return ms < rise
    ? (ms / rise) * ripplePeak
    : ((rippleLightMs - ms) / (rippleLightMs - rise)) * ripplePeak;
}
