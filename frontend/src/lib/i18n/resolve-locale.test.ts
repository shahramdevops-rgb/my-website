import { describe, expect, it } from "vitest";
import { resolveLocale } from "./resolve-locale";

describe("resolveLocale", () => {
  it("prefers the lang cookie over the browser's languages", () => {
    expect(resolveLocale("en", "fa-IR,fa;q=0.9")).toBe("en");
  });

  it("ignores a cookie with an unsupported value", () => {
    expect(resolveLocale("de", "en-US,en;q=0.9")).toBe("en");
  });

  it("picks the supported language with the highest weight", () => {
    expect(resolveLocale(undefined, "de-DE, fa;q=0.5, en-GB;q=0.8")).toBe("en");
  });

  it("keeps the browser's order for equal weights", () => {
    expect(resolveLocale(undefined, "fa, en")).toBe("fa");
  });

  it("skips languages marked q=0", () => {
    expect(resolveLocale(undefined, "en;q=0, fa;q=0.1")).toBe("fa");
  });

  it("falls back to fa without a cookie or a supported language", () => {
    expect(resolveLocale(undefined, "de-DE,de;q=0.9")).toBe("fa");
    expect(resolveLocale(undefined, null)).toBe("fa");
  });
});
