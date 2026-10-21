import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env";

describe("parseServerEnv", () => {
  it("returns the API URL without a trailing slash", () => {
    const env = parseServerEnv({ API_INTERNAL_URL: "http://api:8080/" });

    expect(env.apiInternalUrl).toBe("http://api:8080");
  });

  it("fails when API_INTERNAL_URL is missing", () => {
    expect(() => parseServerEnv({})).toThrow("API_INTERNAL_URL is not set.");
  });

  it("fails when API_INTERNAL_URL is not an http(s) URL", () => {
    expect(() => parseServerEnv({ API_INTERNAL_URL: "api:8080" })).toThrow(
      "API_INTERNAL_URL must be an absolute http(s) URL",
    );
  });
});
