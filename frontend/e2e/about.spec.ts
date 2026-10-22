import { expect, test } from "@playwright/test";

const mobile = { width: 360, height: 740 };
const desktop = { width: 1440, height: 900 };

test.describe("about page", () => {
  test("tells the story in English: timeline from the résumé, bridges, skills, one alternate name", async ({
    page,
  }) => {
    await page.goto("/en/about");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("From circuits to cloud");
    await expect(page).toHaveTitle("About e2e test name");

    // e2e/mock-api.ts lists the degrees newest first; the story runs oldest first and ends today.
    const timeline = page.getByRole("region", { name: "The path" });
    await expect(timeline.getByRole("heading", { level: 3 })).toHaveText([
      "BSc in e2e field",
      "MSc in e2e field",
      "Software engineering",
    ]);

    await expect(page.getByRole("heading", { name: "In software: Observability" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: /^In software:/ })).toHaveCount(3);

    const skills = page.getByRole("region", { name: "Skills" });
    await expect(skills.getByRole("heading", { name: "e2e group" })).toBeVisible();
    await expect(skills.getByRole("listitem").filter({ hasText: /^C#$/ })).toBeVisible();

    await expect(page.getByText("Shahram Azghandi")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "résumé", exact: true })).toHaveAttribute(
      "href",
      "/en/resume",
    );
  });

  test("tells the same story in Persian, right to left", async ({ page }) => {
    await page.setViewportSize(desktop);
    await page.goto("/fa/about");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("از مدار تا ابر");
    await expect(
      page.getByRole("region", { name: "مسیر" }).getByRole("heading", { level: 3 }),
    ).toHaveCount(3);
    await expect(page.getByText("شهرام ازقندی")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "رزومه", exact: true }).last()).toHaveAttribute(
      "href",
      "/fa/resume",
    );

    // The three bridge cards sit side by side and mirror: the first one is on the right.
    const bridges = page.getByRole("heading", { level: 3, name: /^در نرم‌افزار:/ });
    const first = await bridges.nth(0).boundingBox();
    const second = await bridges.nth(1).boundingBox();
    expect(first?.y).toBe(second?.y);
    expect(first?.x ?? 0).toBeGreaterThan(second?.x ?? 0);
  });

  for (const locale of ["fa", "en"]) {
    test(`/${locale}/about fits 360 px with no sideways scroll`, async ({ page }) => {
      await page.setViewportSize(mobile);
      await page.goto(`/${locale}/about`);

      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        mobile.width,
      );
    });
  }

  test("the navigation marks About as the current page", async ({ page }) => {
    await page.setViewportSize(desktop);
    await page.goto("/en/about");

    await expect(
      page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "About" }),
    ).toHaveAttribute("aria-current", "page");
  });
});
