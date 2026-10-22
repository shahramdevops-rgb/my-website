import { expect, type Page, test } from "@playwright/test";

declare global {
  interface Window {
    __viewTransition?: boolean;
  }
}

const mobile = { width: 360, height: 740 };
const desktop = { width: 1440, height: 900 };

test.describe("header", () => {
  test("the skip link is the first Tab stop and moves focus to the main content", async ({
    page,
  }) => {
    await page.goto("/en");

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeInViewport();

    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
  });

  test("the main navigation lists every section and marks the current page", async ({ page }) => {
    await page.setViewportSize(desktop);
    await page.goto("/fa");

    const nav = page.getByRole("navigation", { name: "اصلی" });
    await expect(nav.getByRole("link")).toHaveCount(7);
    await expect(nav.getByRole("link", { name: "خانه" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "بلاگ" })).toHaveAttribute("href", "/fa/blog");
  });

  test("below lg the navigation is a menu: Esc closes it and focus returns", async ({ page }) => {
    await page.setViewportSize(mobile);
    await page.goto("/en");
    const menuButton = page.getByRole("button", { name: "Menu" });
    const blogLink = page.getByRole("link", { name: "Blog" });
    await expect(blogLink).toBeHidden();

    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(blogLink).toBeVisible();

    // Keyboard only: Tab from the button lands in the panel.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Home" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(menuButton).toBeFocused();
    await expect(blogLink).toBeHidden();
  });
});

test.describe("language switcher", () => {
  test("opens the same page in the other language and remembers the choice", async ({
    page,
    context,
  }) => {
    await page.goto("/fa?ref=e2e");

    await page.getByRole("link", { name: "English" }).click();

    await expect(page).toHaveURL(/\/en\?ref=e2e$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    const cookies = await context.cookies();
    expect(cookies.find((cookie) => cookie.name === "lang")?.value).toBe("en");

    // The cookie now wins over the browser's language when `/` picks one.
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
  });

  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`animates with a View Transition only without reduced motion (${reducedMotion})`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion });
      // `pagereveal` fires on the new page; its viewTransition is set when the browser animates into it.
      await page.addInitScript(() => {
        window.addEventListener("pagereveal", (event) => {
          window.__viewTransition = (event as PageRevealEvent).viewTransition !== null;
        });
      });
      await page.goto("/en");

      await page.getByRole("link", { name: "فارسی" }).click();

      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      expect(await page.evaluate(() => window.__viewTransition)).toBe(
        reducedMotion === "no-preference",
      );
    });
  }
});

test.describe("footer", () => {
  test("shows only the configured contact links and the year in the locale's calendar", async ({
    page,
  }) => {
    await page.goto("/fa");
    const footer = page.locator("footer");

    await expect(footer.getByRole("link", { name: "ایمیل" })).toHaveAttribute(
      "href",
      "mailto:e2e@example.com",
    );
    await expect(footer.getByRole("link", { name: "گیت‌هاب" })).toBeVisible();
    // Telegram is null in e2e/mock-api.ts: not configured, not shown.
    await expect(footer.getByRole("link", { name: "تلگرام" })).toHaveCount(0);
    // A Solar Hijri year in Persian digits (۱۴۰۵ in 2026).
    await expect(footer).toContainText(/© [۰-۹]{4} /);
  });
});

test.describe("404 pages", () => {
  test("an unknown page answers 404 with the localized page inside the layout", async ({
    page,
  }) => {
    const response = await page.goto("/en/no-such-page");

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
    await expect(page).toHaveTitle("Page not found");
    await expect(page.locator("header")).toBeVisible();
  });

  // The style guide is a development tool (P2-T10); e2e runs a production build, where it must not exist.
  for (const locale of ["fa", "en"]) {
    test(`the style guide is a 404 in production (${locale})`, async ({ request }) => {
      const response = await request.get(`/${locale}/_styleguide`);

      expect(response.status()).toBe(404);
    });
  }

  for (const [browserLocale, title] of [
    ["en-US", "Page not found"],
    ["fa-IR", "صفحه پیدا نشد"],
  ] as const) {
    test.describe(`browser language ${browserLocale}`, () => {
      // Sets the browser's Accept-Language (an extra header would be overridden by Chromium's own).
      test.use({ locale: browserLocale });

      test("an unknown language is a 404 page in the visitor's language", async ({ page }) => {
        const response = await page.goto("/de/about");

        expect(response?.status()).toBe(404);
        await expect(page).toHaveURL(/\/de\/about$/);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      });
    });
  }
});

/** True when the page is wider than the window, i.e. it scrolls sideways. */
const overflowsHorizontally = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

for (const viewport of [mobile, desktop]) {
  for (const locale of ["fa", "en"] as const) {
    for (const theme of ["dark", "light"] as const) {
      test(`no sideways scrolling at ${viewport.width}px (${locale}, ${theme})`, async ({
        page,
      }) => {
        await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
        await page.setViewportSize(viewport);

        await page.goto(`/${locale}`);

        await expect(page.locator("html")).toHaveAttribute("dir", locale === "fa" ? "rtl" : "ltr");
        expect(await overflowsHorizontally(page)).toBe(false);
      });
    }
  }
}
