import { expect, type Page, test } from "@playwright/test";

// Light-theme page background (--color-bg, architecture.md §8.1) as the browser reports it.
const lightBackground = "rgb(246, 247, 249)";

const htmlBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);

test("a saved light theme is applied before any bundle runs (no flash)", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", "light"));
  // No JavaScript bundles: React never starts, so only the inline pre-paint script can set the theme.
  await page.route("**/_next/static/chunks/**/*.js", (route) => route.abort());

  await page.goto("/fa");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await htmlBackground(page)).toBe(lightBackground);
});

test("the toggle switches the theme and the choice survives a reload", async ({ page }) => {
  // A hydration mismatch (the pre-paint script vs React) would show up as a console error.
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/en");
  const toggle = page.getByRole("button", { name: "Dark theme" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  await toggle.click();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("button", { name: "Dark theme" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  expect(errors).toEqual([]);
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`theme switch with reducedMotion=${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/en");
    await expect(page.getByRole("button", { name: "Dark theme" })).toBeEnabled();

    // Click and read the body's transition in the same task, while .theme-transition is on <html>.
    const duration = await page.evaluate(() => {
      document.querySelector<HTMLButtonElement>("button[aria-pressed]")?.click();
      return getComputedStyle(document.body).transitionDuration;
    });

    expect(duration.startsWith("0s")).toBe(reducedMotion === "reduce");
  });
}

test("no request leaves the origin, and the fonts come from it", async ({ page, baseURL }) => {
  const requests: { url: string; type: string }[] = [];
  page.on("request", (request) =>
    requests.push({ url: request.url(), type: request.resourceType() }),
  );

  for (const route of ["/fa", "/en"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
  }

  const origin = new URL(baseURL ?? "").origin;
  expect(requests.filter((r) => new URL(r.url).origin !== origin)).toEqual([]);
  expect(requests.filter((r) => r.type === "font").length).toBeGreaterThan(0);
});
