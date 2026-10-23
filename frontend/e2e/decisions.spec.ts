import { expect, type Page, test } from "@playwright/test";

const mobile = { width: 360, height: 740 };
const desktop = { width: 1440, height: 900 };

/** The labels of every card's three parts (`<dt>`s), card by card. */
function partLabels(page: Page): Promise<string[][]> {
  return page
    .getByRole("article")
    .evaluateAll((cards) =>
      cards.map((card) => [...card.querySelectorAll("dt")].map((term) => term.textContent ?? "")),
    );
}

test.describe("engineering decisions page", () => {
  test("shows six cards in English, each Challenge → Decision → Why, all text visible", async ({
    page,
  }) => {
    await page.setViewportSize(desktop);
    await page.goto("/en/decisions");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Engineering decisions");
    await expect(page).toHaveTitle("Engineering decisions — e2e test name");

    const cards = page.getByRole("article");
    await expect(cards).toHaveCount(6);
    // Each card is named by its own heading.
    await expect(
      page.getByRole("article", { name: "No generic repository over EF Core" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(6);

    expect(await partLabels(page)).toEqual(Array(6).fill(["Challenge", "Decision", "Why"]));
    // Readable without interaction: every part's text is on the page, nothing collapsed.
    for (const definition of await page.locator("dd").all()) await expect(definition).toBeVisible();

    // Two cards side by side at 1440 px.
    const [first, second] = await Promise.all(
      [cards.nth(0), cards.nth(1)].map((c) => c.boundingBox()),
    );
    expect(second?.y).toBe(first?.y);
  });

  test("says the same in Persian, right to left", async ({ page }) => {
    await page.goto("/fa/decisions");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("تصمیم‌های مهندسی");
    await expect(page.getByRole("article")).toHaveCount(6);
    expect(await partLabels(page)).toEqual(Array(6).fill(["چالش", "تصمیم", "چرا"]));
    await expect(page.getByRole("link", { name: "رزومه‌ام" })).toHaveAttribute(
      "href",
      "/fa/resume",
    );
  });

  test("renders in the light theme too", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "light"));
    await page.goto("/en/decisions");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.getByRole("article")).toHaveCount(6);
  });

  for (const locale of ["fa", "en"]) {
    test(`/${locale}/decisions fits 360 px with no sideways scroll`, async ({ page }) => {
      await page.setViewportSize(mobile);
      await page.goto(`/${locale}/decisions`);

      await expect(page.getByRole("article")).toHaveCount(6);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        mobile.width,
      );
    });
  }

  test("the hiring path on the home page leads here", async ({ page }) => {
    await page.setViewportSize(desktop);
    await page.goto("/en");

    await page
      .getByRole("region", { name: "See how I work", exact: true })
      .getByRole("link", { name: "Engineering decisions" })
      .click();

    await expect(page).toHaveURL("/en/decisions");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Engineering decisions");
  });

  test("the About page links here", async ({ page }) => {
    await page.goto("/en/about");

    await page.getByRole("link", { name: "engineering decisions", exact: true }).click();

    await expect(page).toHaveURL("/en/decisions");
  });

  test("the Resume page links here, in both languages", async ({ page }) => {
    await page.goto("/fa/resume");
    await expect(page.getByRole("link", { name: "تصمیم‌های مهندسی", exact: true })).toHaveAttribute(
      "href",
      "/fa/decisions",
    );

    await page.goto("/en/resume");
    await page.getByRole("link", { name: "engineering decisions", exact: true }).click();

    await expect(page).toHaveURL("/en/decisions");
  });
});
