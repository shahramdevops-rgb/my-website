import { describe, expect, it } from "vitest";
import { isCurrentSection } from "./navigation";

describe("isCurrentSection", () => {
  it("matches Home only on the home page", () => {
    expect(isCurrentSection("/", "/")).toBe(true);
    expect(isCurrentSection("/blog", "/")).toBe(false);
  });

  it("matches a section and its sub-pages", () => {
    expect(isCurrentSection("/blog", "/blog")).toBe(true);
    expect(isCurrentSection("/blog/my-first-post", "/blog")).toBe(true);
  });

  it("does not match a different section that starts with the same letters", () => {
    expect(isCurrentSection("/blogroll", "/blog")).toBe(false);
  });
});
