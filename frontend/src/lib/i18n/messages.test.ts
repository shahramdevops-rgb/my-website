import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fa from "../../../messages/fa.json";

/** `{ a: { b: "x" } }` → `["a.b"]`: every leaf as a dot-notation key. */
function keys(messages: object, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? keys(value as object, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

function leaves(messages: object): unknown[] {
  return Object.values(messages).flatMap((value) =>
    typeof value === "object" && value !== null ? leaves(value as object) : [value],
  );
}

describe("messages", () => {
  // A key in only one file would show the raw key (or nothing) to visitors of the other language.
  it("fa.json and en.json have exactly the same keys", () => {
    expect(keys(fa).sort()).toEqual(keys(en).sort());
  });

  it("has no empty or non-text values", () => {
    for (const value of [...leaves(fa), ...leaves(en)]) {
      expect(typeof value === "string" && value.trim().length > 0).toBe(true);
    }
  });
});
