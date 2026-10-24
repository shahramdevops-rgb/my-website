import { beforeEach, describe, expect, it } from "vitest";
import { setFlash, takeFlash } from "./flash";

describe("flash messages", () => {
  beforeEach(() => sessionStorage.clear());

  it("hands a message to the next page exactly once", () => {
    setFlash("signedOut");

    expect(takeFlash()).toBe("signedOut");
    expect(takeFlash()).toBeUndefined();
  });

  it("ignores values it didn't write", () => {
    sessionStorage.setItem("admin.flash", "<script>");

    expect(takeFlash()).toBeUndefined();
  });
});
