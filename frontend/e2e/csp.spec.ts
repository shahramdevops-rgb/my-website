import { expect, type Page, test } from "@playwright/test";

// Every HTML route the site has today (the 404 page included). Add new routes here as they appear.
const routes = [
  "/fa",
  "/en",
  "/fa/about",
  "/en/about",
  "/fa/services",
  "/en/services",
  "/fa/resume",
  "/en/resume",
  "/fa/no-such-page",
  "/en/no-such-page",
  "/de",
];

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

    // Every script the server wrote carries this request's nonce.
    const scriptTags = (await response?.text())?.match(/<script\b[^>]*>/g) ?? [];
    expect(scriptTags.length).toBeGreaterThan(0);
    for (const tag of scriptTags) expect(tag).toContain(`nonce="${nonceOf(policy)}"`);

    // Scripts added later by Next's chunk loader have no nonce: 'strict-dynamic' trusts them because a nonced
    // script inserted them. They must still be our own files. (The DOM hides nonce attributes; the property
    // still holds the value.)
    const addedLater = await page.$$eval("script", (scripts) =>
      scripts.filter((s) => !s.nonce).map((s) => s.src),
    );
    for (const src of addedLater) expect(new URL(src).pathname).toMatch(/^\/_next\/static\//);

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
