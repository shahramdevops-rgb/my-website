import { expect, test } from "@playwright/test";

// Site names served by e2e/mock-api.ts.
const names = { fa: "نام آزمایشی e2e", en: "e2e test name" } as const;

test.describe("language routing", () => {
  test("/ redirects a Persian browser to /fa with a 302", async ({ request }) => {
    const response = await request.get("/", {
      headers: { "accept-language": "fa-IR,fa;q=0.9" },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(302);
    expect(new URL(response.headers()["location"] ?? "", "http://x").pathname).toBe("/fa");
  });

  test("/ redirects an English browser to /en", async ({ request }) => {
    const response = await request.get("/", {
      headers: { "accept-language": "en-US,en;q=0.9" },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(302);
    expect(new URL(response.headers()["location"] ?? "", "http://x").pathname).toBe("/en");
  });

  test("the lang cookie wins over the browser's language", async ({ request }) => {
    const response = await request.get("/", {
      headers: { "accept-language": "en-US", cookie: "lang=fa" },
      maxRedirects: 0,
    });

    expect(new URL(response.headers()["location"] ?? "", "http://x").pathname).toBe("/fa");
  });

  test("an unsupported language is a 404", async ({ request }) => {
    const response = await request.get("/de");

    expect(response.status()).toBe(404);
  });
});

for (const [locale, dir] of [
  ["fa", "rtl"],
  ["en", "ltr"],
] as const) {
  test(`/${locale} renders with lang="${locale}" dir="${dir}" and the site name`, async ({
    page,
  }) => {
    const response = await page.goto(`/${locale}`);

    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", dir);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(names[locale]);
    await expect(page).toHaveTitle(names[locale]);
  });
}
