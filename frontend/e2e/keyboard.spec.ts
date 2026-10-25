import { expect, type Page, test } from "@playwright/test";

// The tech stack of e2e/mock-api.ts: C# (key C), .NET (N), React (R); also used: Python (P), Redis (E).
const technologies = ["C#", ".NET", "React"] as const;
const alsoUsed = ["Python", "Redis"] as const;

const stackCard = (page: Page) => page.getByRole("region", { name: "Tech stack", exact: true });
const techButton = (page: Page, name: string) =>
  stackCard(page).getByRole("button", { name, exact: true });

/** Sum of the page's layout shifts so far (the browser's own CLS entries). */
const layoutShift = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          resolve(
            list
              .getEntries()
              .reduce(
                (sum, entry) => sum + (entry as PerformanceEntry & { value: number }).value,
                0,
              ),
          );
        }).observe({ type: "layout-shift", buffered: true });
        // No entry at all means nothing moved; the observer then never calls back.
        setTimeout(() => resolve(0), 500);
      }),
  );

test.describe("keyboard hero", () => {
  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("the poster and the list of technologies are in the first paint", async ({ page }) => {
      await page.goto("/en");

      const poster = page.getByTestId("keyboard-poster");
      await expect(poster).toBeVisible();
      for (const name of [...technologies, ...alsoUsed]) await expect(poster).toContainText(name);
      await expect(stackCard(page).getByRole("button")).toHaveCount(
        technologies.length + alsoUsed.length,
      );
    });
  });

  test("loading the 3D scene moves nothing on the page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en");
    const stage = page.getByTestId("keyboard-stage");
    const before = await stage.boundingBox();

    // Headless browsers may have no WebGL; then the poster stays, which must not move anything either.
    await page
      .locator("[data-testid=keyboard-stage] canvas")
      .waitFor({ timeout: 5_000 })
      .catch(() => {});
    await page.waitForTimeout(800);

    expect(await stage.boundingBox()).toEqual(before);
    expect(await layoutShift(page)).toBeLessThan(0.01);
  });

  test("a real key opens its card while the pointer is over the keyboard, Esc closes it", async ({
    page,
  }) => {
    await page.goto("/en");
    await page.getByTestId("keyboard-stage").hover();

    await page.keyboard.press("r");

    await expect(techButton(page, "React")).toHaveAttribute("aria-expanded", "true");
    await expect(stackCard(page).getByRole("heading", { name: "React", level: 3 })).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(techButton(page, "React")).toHaveAttribute("aria-expanded", "false");
  });

  test("real keys also work while focus is in the list, and not elsewhere", async ({ page }) => {
    await page.goto("/en");

    await page.keyboard.press("n");
    await expect(techButton(page, ".NET")).toHaveAttribute("aria-expanded", "false");

    await techButton(page, "C#").focus();
    await page.keyboard.press("n");

    await expect(techButton(page, ".NET")).toHaveAttribute("aria-expanded", "true");
  });

  test("the list of buttons exposes every card", async ({ page }) => {
    await page.goto("/fa");
    const card = page.getByRole("region", { name: "پشته فنی" });

    for (const name of [...technologies, ...alsoUsed]) {
      const button = card.getByRole("button", { name, exact: true });
      await button.click();

      await expect(button).toHaveAttribute("aria-expanded", "true");
      const panel = page.locator(`[id="${await button.getAttribute("aria-controls")}"]`);
      await expect(panel.getByRole("heading", { level: 3 })).toHaveText(name);
    }
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("the poster stays and no 3D scene loads", async ({ page }) => {
      await page.goto("/en");
      await page.waitForLoadState("networkidle");

      await expect(page.getByTestId("keyboard-poster")).toBeVisible();
      await expect(page.locator("[data-testid=keyboard-stage] canvas")).toHaveCount(0);
    });
  });
});
