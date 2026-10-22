import { afterEach, describe, expect, it } from "vitest";
import { otherLocale, rememberLocale } from "./locale-cookie";

afterEach(() => {
  document.cookie = "lang=; Path=/; Max-Age=0";
});

describe("otherLocale", () => {
  it("offers English on Persian pages and Persian on English pages", () => {
    expect(otherLocale("fa")).toBe("en");
    expect(otherLocale("en")).toBe("fa");
  });
});

describe("rememberLocale", () => {
  it("stores the choice in the lang cookie that proxy.ts reads", () => {
    rememberLocale("en");

    expect(document.cookie).toContain("lang=en");
  });
});
