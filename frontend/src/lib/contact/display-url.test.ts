import { describe, expect, it } from "vitest";
import { displayUrl } from "./display-url";

describe("displayUrl", () => {
  it("drops the scheme and a trailing slash", () => {
    expect(displayUrl("https://github.com/e2e")).toBe("github.com/e2e");
    expect(displayUrl("https://t.me/someone/")).toBe("t.me/someone");
  });

  it("drops the query and the fragment", () => {
    expect(displayUrl("https://github.com/e2e?tab=repositories#top")).toBe("github.com/e2e");
  });
});
