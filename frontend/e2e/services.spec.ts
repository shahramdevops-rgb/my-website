import { expect, type Page, test } from "@playwright/test";

const mobile = { width: 360, height: 740 };
const desktop = { width: 1440, height: 900 };

/** The step badges' CSS `content`: the browser reports the counter expression, e.g. `counter(step, persian)`. */
function stepNumberContent(page: Page): Promise<string[]> {
  return page
    .locator(".step-number")
    .evaluateAll((badges) => badges.map((badge) => getComputedStyle(badge, "::before").content));
}

test.describe("services page", () => {
  test("lists the services and the steps in English, ending with one call to action", async ({
    page,
  }) => {
    await page.goto("/en/services");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("What I can build for you");
    await expect(page).toHaveTitle("Services — e2e test name");

    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "What I offer",
      "How I work",
      "Have a project in mind?",
    ]);
    await expect(page.getByRole("heading", { name: "Full-stack web applications" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Code review and consulting" })).toBeVisible();

    // The steps are an ordered list: the order is part of the meaning.
    const steps = page.locator("ol.steps > li");
    await expect(steps).toHaveCount(4);
    await expect(steps.first().getByRole("heading")).toHaveText("Understand");
    for (const value of await stepNumberContent(page)) expect(value).not.toContain("persian");

    const cta = page.getByRole("region", { name: "Have a project in mind?" });
    await expect(cta.getByRole("link", { name: "Start a project" })).toHaveAttribute(
      "href",
      "/en/contact?type=project",
    );
  });

  test("says the same in Persian, right to left, with Persian step numbers", async ({ page }) => {
    await page.setViewportSize(desktop);
    await page.goto("/fa/services");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "چه چیزی می‌توانم برایتان بسازم",
    );
    await expect(page.locator("ol.steps > li")).toHaveCount(4);
    await expect(
      page.getByRole("region", { name: "پروژه‌ای در ذهن دارید؟" }).getByRole("link"),
    ).toHaveAttribute("href", "/fa/contact?type=project");

    // The steps count in Persian digits (۱ ۲ ۳ ۴) here, in Latin digits on the English page.
    const content = await stepNumberContent(page);
    expect(content).toHaveLength(4);
    for (const value of content) expect(value).toContain("persian");
  });

  for (const locale of ["fa", "en"]) {
    test(`/${locale}/services fits 360 px with no sideways scroll`, async ({ page }) => {
      await page.setViewportSize(mobile);
      await page.goto(`/${locale}/services`);

      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        mobile.width,
      );
    });
  }

  test("the navigation marks Services as the current page", async ({ page }) => {
    await page.setViewportSize(desktop);
    await page.goto("/en/services");

    await expect(
      page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Services" }),
    ).toHaveAttribute("aria-current", "page");
  });
});
