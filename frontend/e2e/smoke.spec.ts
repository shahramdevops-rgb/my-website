import { expect, test } from "@playwright/test";

test("home page renders the site name from the API", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  // Served by e2e/mock-api.ts.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("نام آزمایشی e2e");
});
