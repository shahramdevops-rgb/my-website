import { expect, type Page, test } from "@playwright/test";

// Must match e2e/mock-api.ts.
const admin = { email: "admin@e2e.test", password: "e2e correct passphrase" };
const rateLimitedEmail = "limited@e2e.test";
// Must match playwright.config.ts.
const mockApi = "http://localhost:3101";

/**
 * In production Caddy sends the browser's `/api/*` requests to the API; `next start` has no such route. Here the
 * browser's API calls are forwarded to the mock API instead — with their cookies, and its Set-Cookie answers
 * reach the browser, so the session cookie behaves as it does behind Caddy.
 */
async function forwardApiToMock(page: Page): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `${mockApi}${url.pathname}${url.search}` });
    await route.fulfill({ response });
  });
}

async function signIn(page: Page, email = admin.email, password = admin.password): Promise<void> {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

// The panel's language follows the `lang` cookie, then Accept-Language: an English browser gets English.
test.use({ locale: "en-US" });

test.beforeEach(async ({ page }) => {
  await forwardApiToMock(page);
});

test.describe("admin panel", () => {
  test("without a session every panel page leads to the login page, never indexed or cached", async ({
    page,
    request,
  }) => {
    const redirect = await request.get("/admin/posts?page=2", { maxRedirects: 0 });
    expect(redirect.status()).toBe(302);
    expect(redirect.headers()["location"]).toBe("/admin/login?next=%2Fadmin%2Fposts%3Fpage%3D2");

    const response = await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
    expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    expect(response?.headers()["cache-control"]).toContain("no-store");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    await expect(page).toHaveTitle("Sign in · Admin");
  });

  test("a wrong password shows the error and keeps the email", async ({ page }) => {
    await page.goto("/admin/login");

    await signIn(page, admin.email, "a wrong passphrase");

    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "The email or password is wrong.",
    );
    await expect(page.getByLabel("Email")).toHaveValue(admin.email);
    await expect(page.getByLabel("Password")).toHaveValue("");
  });

  test("the rate limit says how long to wait", async ({ page }) => {
    await page.goto("/admin/login");

    await signIn(page, rateLimitedEmail, "any passphrase");

    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Try again in 2 minutes.",
    );
  });

  test("sign in → dashboard → sign out", async ({ page }) => {
    await page.goto("/admin");
    await signIn(page);

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("status", { name: "Notifications" })).toContainText("Signed in.");
    await expect(
      page.getByText("Signed in as admin@e2e.test").filter({ visible: true }),
    ).toBeVisible();
    await expect(page.getByText("Comments awaiting review")).toBeVisible();
    await expect(page.getByText("1,234")).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Admin" });
    await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // Sections of later phases are listed, but are not links to a 404.
    await expect(nav.getByRole("link", { name: /Posts/ })).toHaveCount(0);
    await expect(nav.getByText("Posts")).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("status", { name: "Notifications" })).toContainText("Signed out.");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("after signing in the admin returns to the requested page, never to another site", async ({
    page,
  }) => {
    await page.goto("/admin/login?next=https%3A%2F%2Fevil.example%2F");
    await signIn(page);

    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/admin$/);
  });

  test("an expired session cookie is sent back to the login page", async ({ page }) => {
    await page.goto("/admin/login");
    // A cookie the API doesn't accept (expired or revoked). Set from the page: the browser treats localhost as
    // secure, so a __Host- cookie is allowed there.
    await page.evaluate(() => {
      document.cookie = "__Host-admin=expired; Path=/; Secure";
    });

    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  for (const width of [360, 1440]) {
    test(`Persian and right-to-left from the lang cookie, without overflow at ${width}px`, async ({
      page,
      context,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await context.addCookies([{ name: "lang", value: "fa", url: "http://localhost:3100" }]);
      await page.goto("/admin/login");
      await page.getByLabel("ایمیل").fill(admin.email);
      await page.getByLabel("رمز عبور").fill(admin.password);
      await page.getByRole("button", { name: "ورود" }).click();

      await expect(page.getByRole("heading", { level: 1, name: "داشبورد" })).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(page.getByText("۱٬۲۳۴")).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);

      // Below lg, signing out lives in the menu together with the account.
      if (width < 1024) await page.getByRole("button", { name: "منوی مدیریت" }).click();
      await page.getByRole("button", { name: "خروج" }).click();
      await expect(page).toHaveURL(/\/admin\/login$/);
    });
  }
});
