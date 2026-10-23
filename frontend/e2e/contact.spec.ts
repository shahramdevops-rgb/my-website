import { expect, test } from "@playwright/test";

const mobile = { width: 360, height: 740 };
const desktop = { width: 1440, height: 900 };

// e2e/mock-api.ts configures email (e2e@example.com) and GitHub, not Telegram.
test.describe("contact page", () => {
  test("shows a card per configured link in English, and the form placeholder", async ({
    page,
  }) => {
    await page.goto("/en/contact");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Get in touch");
    await expect(page).toHaveTitle("Contact — e2e test name");
    await expect(page.getByText("A question, an offer or just a hello")).toBeVisible();

    const links = page.getByRole("region", { name: "Ways to reach me" });
    await expect(links.getByRole("listitem")).toHaveCount(2);
    await expect(links.getByRole("heading", { level: 3 })).toHaveText(["Email", "GitHub"]);
    await expect(links.getByRole("link", { name: "github.com/e2e" })).toHaveAttribute(
      "href",
      "https://github.com/e2e",
    );
    // Telegram is null in the mock: not configured, no card.
    await expect(links.getByRole("heading", { name: "Telegram" })).toHaveCount(0);

    const form = page.getByRole("region", { name: "Contact form" });
    await expect(form.getByText("In progress")).toBeVisible();
    await expect(form.getByRole("textbox")).toHaveCount(0);
  });

  test("the email works after hydration but is not in the server's HTML", async ({ page }) => {
    const response = await page.goto("/en/contact");
    const html = (await response?.text()) ?? "";

    expect(html).not.toContain("e2e@example.com");
    expect(html).not.toContain("mailto:");
    // Without JavaScript the card reads the address in a harvester-unfriendly form.
    expect(html).toContain("e2e [at] example.com");

    const links = page.getByRole("region", { name: "Ways to reach me" });
    await expect(links.getByRole("link", { name: "e2e@example.com" })).toHaveAttribute(
      "href",
      "mailto:e2e@example.com",
    );
  });

  test("says the same in Persian, right to left", async ({ page }) => {
    await page.goto("/fa/contact");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("با من در تماس باشید");
    await expect(page).toHaveTitle("تماس — نام آزمایشی e2e");
    const links = page.getByRole("region", { name: "راه‌های تماس با من" });
    await expect(links.getByRole("heading", { level: 3 })).toHaveText(["ایمیل", "گیت‌هاب"]);
    await expect(links.getByRole("link", { name: "e2e@example.com" })).toHaveAttribute(
      "href",
      "mailto:e2e@example.com",
    );
    await expect(page.getByRole("region", { name: "فرم تماس" })).toContainText("در حال ساخت");
  });

  for (const [query, text] of [
    ["?type=project", "Tell me about your project"],
    ["?type=hiring", "Hiring? Tell me about the role"],
    ["?type=<b>other</b>", "A question, an offer or just a hello"],
  ] as const) {
    test(`the intro fits the request type (${query})`, async ({ page }) => {
      await page.goto(`/en/contact${query}`);

      // The line under the h1 (SectionHeader's description).
      await expect(page.locator("h1 + p")).toContainText(text);
      // An unknown value is never echoed.
      await expect(page.locator("main")).not.toContainText("other");
    });
  }

  test("in Persian too, ?type=project gets the project intro", async ({ page }) => {
    await page.goto("/fa/contact?type=project");

    await expect(page.getByText("از پروژه‌تان برایم بنویسید")).toBeVisible();
  });

  for (const locale of ["fa", "en"]) {
    test(`/${locale}/contact fits 360 px with no sideways scroll`, async ({ page }) => {
      await page.setViewportSize(mobile);
      await page.goto(`/${locale}/contact`);

      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        mobile.width,
      );
    });
  }

  test("the navigation marks Contact as the current page", async ({ page }) => {
    await page.setViewportSize(desktop);
    await page.goto("/en/contact?type=project");

    await expect(
      page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Contact" }),
    ).toHaveAttribute("aria-current", "page");
  });
});
