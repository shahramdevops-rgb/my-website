import { describe, expect, it } from "vitest";
import { buildKeycaps } from "@/lib/keyboard/keycaps";
import { rippleDelayMs, rippleLevel, rippleLightMs, ripplePeak, rippleStepMs } from "./ripple";

describe("rippleLevel", () => {
  it("is dark before the wave arrives and after it passed", () => {
    expect(rippleLevel(-10)).toBe(0);
    expect(rippleLevel(0)).toBe(0);
    expect(rippleLevel(rippleLightMs)).toBe(0);
  });

  it("flares fast and fades slower", () => {
    const top = rippleLightMs * 0.25;

    expect(rippleLevel(top)).toBeCloseTo(ripplePeak);
    expect(rippleLevel(top / 2)).toBeCloseTo(ripplePeak / 2);
    expect(rippleLevel(top + (rippleLightMs - top) / 2)).toBeCloseTo(ripplePeak / 2);
  });
});

describe("rippleDelayMs", () => {
  it("reaches keys later the farther they are from the pressed one", () => {
    const tech = (id: string) => ({ id, name: id, description: id, category: "backend" as const });
    const keycaps = buildKeycaps({
      techStack: [tech("a"), tech("b"), tech("c")],
      alsoUsed: [],
      experience: [],
    });
    const [a, b, c] = keycaps;
    if (!a || !b || !c) throw new Error("Three keycaps expected.");

    expect(rippleDelayMs(keycaps, a, a)).toBe(0);
    expect(rippleDelayMs(keycaps, a, b)).toBe(rippleStepMs);
    expect(rippleDelayMs(keycaps, a, c)).toBe(2 * rippleStepMs);
  });
});
