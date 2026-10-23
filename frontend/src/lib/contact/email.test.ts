import { describe, expect, it } from "vitest";
import { decodeEmail, encodeEmail, splitEmail } from "./email";

describe("encodeEmail / decodeEmail", () => {
  it("round-trips an address", () => {
    for (const address of ["e2e@example.com", "first.last+tag@sub.example.ir"]) {
      expect(decodeEmail(encodeEmail(address))).toBe(address);
    }
  });

  it("leaves neither the address nor its parts readable", () => {
    const encoded = JSON.stringify(encodeEmail("e2e@example.com"));

    expect(encoded).not.toContain("@");
    expect(encoded).not.toContain("example");
    expect(encodeEmail("ab")).toEqual([98, 97]);
  });
});

describe("splitEmail", () => {
  it("splits at the last @", () => {
    expect(splitEmail("e2e@example.com")).toEqual({ user: "e2e", domain: "example.com" });
    expect(splitEmail('"a@b"@example.com')).toEqual({ user: '"a@b"', domain: "example.com" });
  });
});
