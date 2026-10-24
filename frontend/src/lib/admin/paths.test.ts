import { describe, expect, it } from "vitest";
import { isAdminPath, loginUrlFor, safeNextPath } from "./paths";

describe("isAdminPath", () => {
  it.each([
    ["/admin", true],
    ["/admin/", true],
    ["/admin/posts/1", true],
    ["/administrator", false],
    ["/admin-tools", false],
    ["/fa/admin", false],
  ])("%s → %s", (pathname, expected) => {
    expect(isAdminPath(pathname)).toBe(expected);
  });
});

describe("safeNextPath", () => {
  it.each([
    ["/admin/posts", "/admin/posts"],
    ["/admin/posts?page=2", "/admin/posts?page=2"],
    ["/admin", "/admin"],
  ])("keeps a path inside the panel: %s", (value, expected) => {
    expect(safeNextPath(value)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["https://evil.example/admin"],
    ["//evil.example/admin"],
    ["/\\evil.example"],
    ["javascript:alert(1)"],
    ["/fa/about"],
    ["/admin/../fa"],
    ["/admin/login"],
    ["admin/posts"],
  ])("falls back to the dashboard for %s", (value) => {
    expect(safeNextPath(value)).toBe("/admin");
  });
});

describe("loginUrlFor", () => {
  it("adds the path to come back to", () => {
    expect(loginUrlFor("/admin/posts?page=2")).toBe(
      "/admin/login?next=%2Fadmin%2Fposts%3Fpage%3D2",
    );
  });

  it("leaves it out for the dashboard, the default anyway", () => {
    expect(loginUrlFor("/admin")).toBe("/admin/login");
  });
});
