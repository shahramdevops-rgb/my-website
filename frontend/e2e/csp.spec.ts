import { expect, type Page, test } from "@playwright/test";

// Every HTML route the site has today (the 404 page included). Add new routes here as they appear.
const routes = ["/fa", "/en", "/fa/no-such-page"];

declare global {
  interface Window {
    __cspViolations?: string[];
    __next_f?: unknown[];
  }
}

/** Records violations two ways: the DOM event (exact directive) and Chrome's console message. */
async function watchViolations(page: Page): Promise<string[]> {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/content security policy/i.test(message.text())) violations.push(message.text());
  });
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      window.__cspViolations?.push(`${event.violatedDirective}: ${event.blockedURI}`);
    });
  });
  return violations;
}

function nonceOf(policy: string): string {
  return /'nonce-([^']+)'/.exec(policy)?.[1] ?? "";
}

for (const route of routes) {
  test(`${route}: strict CSP, nonce on every script, zero violations`, async ({ page }) => {
    const consoleViolations = await watchViolations(page);

    const response = await page.goto(route);
    await page.waitForLoadState("networkidle");

    const policy = response?.headers()["content-security-policy"] ?? "";
    const scriptSrc = policy.split("; ").find((d) => d.startsWith("script-src ")) ?? "";
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("unsafe-inline");
    expect(policy).not.toContain("unsafe-eval");

    // The browser hides nonce attributes from the DOM; the `nonce` property still holds the value.
    const scriptNonces = await page.$$eval("script", (scripts) => scripts.map((s) => s.nonce));
    expect(scriptNonces.length).toBeGreaterThan(0);
    expect(new Set(scriptNonces)).toEqual(new Set([nonceOf(policy)]));

    // Next's inline scripts fill self.__next_f: if CSP had blocked them, it would not exist.
    expect(await page.evaluate(() => Array.isArray(window.__next_f))).toBe(true);

    expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
    expect(consoleViolations).toEqual([]);
  });
}

test("each page view gets a new nonce", async ({ request }) => {
  const first = (await request.get("/fa")).headers()["content-security-policy"] ?? "";
  const second = (await request.get("/fa")).headers()["content-security-policy"] ?? "";

  expect(nonceOf(first)).not.toBe("");
  expect(nonceOf(first)).not.toBe(nonceOf(second));
});

test("pages send the other security headers", async ({ request }) => {
  const headers = (await request.get("/fa")).headers();

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
});
