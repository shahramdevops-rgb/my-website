import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, createNonce } from "./headers";

function scriptSrc(policy: string): string {
  return policy.split("; ").find((directive) => directive.startsWith("script-src ")) ?? "";
}

describe("contentSecurityPolicy", () => {
  it("allows scripts only by nonce in production", () => {
    const policy = contentSecurityPolicy("abc", { isDev: false });

    expect(scriptSrc(policy)).toBe("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
  });

  it("adds eval and the hot-reload socket only in development", () => {
    const policy = contentSecurityPolicy("abc", { isDev: true });

    expect(scriptSrc(policy)).toContain("'unsafe-eval'");
    expect(policy).toContain("connect-src 'self' ws:");
  });

  it("never allows inline scripts", () => {
    for (const isDev of [false, true]) {
      expect(scriptSrc(contentSecurityPolicy("abc", { isDev }))).not.toContain("unsafe-inline");
    }
  });
});

describe("createNonce", () => {
  it("returns a different base64 value of 16 bytes each time", () => {
    const first = createNonce();

    expect(atob(first)).toHaveLength(16);
    expect(createNonce()).not.toBe(first);
  });
});
