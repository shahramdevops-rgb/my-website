import { describe, expect, it } from "vitest";
import { parseContactRequestType } from "./request-type";

describe("parseContactRequestType", () => {
  it.each(["hiring", "project"] as const)("accepts %s", (type) => {
    expect(parseContactRequestType(type)).toBe(type);
  });

  it.each([undefined, "", "Project", "project ", "<script>", "other"])(
    "turns %j into null (the general text)",
    (value) => {
      expect(parseContactRequestType(value)).toBeNull();
    },
  );

  it("ignores a repeated parameter (?type=project&type=hiring)", () => {
    expect(parseContactRequestType(["project", "hiring"])).toBeNull();
  });
});
