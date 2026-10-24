import { describe, expect, it } from "vitest";
import { loginError } from "./login-error";

describe("loginError", () => {
  it("reads wrong credentials from the API's code", () => {
    expect(loginError(401, "auth.invalid_credentials", null)).toEqual({
      kind: "invalidCredentials",
    });
  });

  it("rounds Retry-After up to whole minutes", () => {
    expect(loginError(429, "request.rate_limited", "61")).toEqual({
      kind: "rateLimited",
      minutes: 2,
    });
  });

  it("falls back to the limit's window without a usable Retry-After", () => {
    expect(loginError(429, undefined, null)).toEqual({ kind: "rateLimited", minutes: 15 });
  });

  it("flags input the API refused", () => {
    expect(loginError(400, undefined, null)).toEqual({ kind: "invalidInput" });
  });

  it.each([
    [500, undefined],
    [502, undefined],
    [403, "request.cross_origin"],
    [401, undefined],
  ])("treats %s (%s) as unavailable, not as a wrong password", (status, code) => {
    expect(loginError(status, code, null)).toEqual({ kind: "unavailable" });
  });
});
