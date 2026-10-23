import { expect, test } from "@playwright/test";

const mobile = { width: 360, height: 740 };
const desktop = { width: 1440, height: 900 };

// The résumé comes from e2e/mock-api.ts.
test.describe("resume page", () => {
  test("renders the résumé in English: basics, experience, education, skills", async ({ page }) => {
    await page.goto("/en/resume");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("e2e test name");
    await expect(page).toHaveTitle("Resume — e2e test name");
    await expect(page.getByText("e2e test headline")).toBeVisible();
    await expect(page.getByText("Based in e2e")).toBeVisible();

    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "Experience",
      "Education",
      "Skills",
    ]);

    const experience = page.getByRole("region", { name: "Experience" });
    await expect(experience.getByRole("heading", { level: 3 })).toHaveText("e2e role");
    await expect(experience.getByText("e2e organization")).toBeVisible();
    await expect(experience.getByText("September 2020 – Present")).toBeVisible();
    await expect(experience.getByText("e2e highlight 2")).toBeVisible();
    // techStack ids → names.
    await expect(
      experience.getByRole("list", { name: "Technologies" }).getByRole("listitem"),
    ).toHaveText(["C#", "React"]);

    const education = page.getByRole("region", { name: "Education" });
    await expect(education.getByRole("heading", { level: 3 })).toHaveText([
      "MSc in e2e field",
      "BSc in e2e field",
    ]);
    await expect(education.getByText("January 2000 – January 2002")).toBeVisible();

    const skills = page.getByRole("region", { name: "Skills" });
    await expect(skills.getByRole("heading", { name: "e2e group" })).toBeVisible();
  });

  test("renders the same résumé in Persian, right to left, with Persian months", async ({
    page,
  }) => {
    await page.goto("/fa/resume");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("نام آزمایشی e2e");
    await expect(page).toHaveTitle("رزومه — نام آزمایشی e2e");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "سوابق کاری",
      "تحصیلات",
      "مهارت‌ها",
    ]);

    const experience = page.getByRole("region", { name: "سوابق کاری" });
    await expect(experience.getByRole("heading", { level: 3 })).toHaveText("نقش آزمایشی e2e");
    await expect(experience.getByText("شهریور ۱۳۹۹ تا اکنون")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "تحصیلات" }).getByRole("heading", { level: 3 }).first(),
    ).toHaveText("MSc e2e field");
  });

  test("the PDF download is a disabled placeholder that says why", async ({ page }) => {
    await page.goto("/en/resume");

    const download = page.getByRole("button", { name: "Download PDF" });
    await expect(download).toBeDisabled();
    await expect(download).toHaveAccessibleDescription("The PDF version is coming soon.");
  });

  test("prints on a light page without the site header, footer or download button", async ({
    page,
  }) => {
    await page.goto("/en/resume");
    await page.emulateMedia({ media: "print" });

    await expect(page.getByRole("banner")).toBeHidden();
    await expect(page.getByRole("contentinfo")).toBeHidden();
    await expect(page.getByRole("button", { name: "Download PDF" })).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // The light theme's --color-bg (#f6f7f9) and --color-text (#111419), although the screen theme is dark.
    const colors = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return { background: style.backgroundColor, text: style.color };
    });
    expect(colors).toEqual({ background: "rgb(246, 247, 249)", text: "rgb(17, 20, 25)" });
  });

  for (const locale of ["fa", "en"]) {
    test(`/${locale}/resume fits 360 px with no sideways scroll`, async ({ page }) => {
      await page.setViewportSize(mobile);
      await page.goto(`/${locale}/resume`);

      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        mobile.width,
      );
    });
  }

  test("the navigation marks Resume as the current page", async ({ page }) => {
    await page.setViewportSize(desktop);
    await page.goto("/en/resume");

    await expect(
      page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Resume" }),
    ).toHaveAttribute("aria-current", "page");
  });
});
