import { expect, type Page, test } from "@playwright/test";

declare global {
  interface Window {
    __soundStarts: number;
  }
}

/** Counts every sound the page starts (each layer of a keystroke is one started source). */
async function countSounds(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__soundStarts = 0;
    // Oscillators use the base class's start(); buffer sources (the noise) have their own.
    for (const prototype of [AudioScheduledSourceNode.prototype, AudioBufferSourceNode.prototype]) {
      const start = prototype.start;
      prototype.start = function (this: AudioScheduledSourceNode, ...args: [number?]) {
        window.__soundStarts++;
        return start.apply(this, args);
      };
    }
  });
}

const sounds = (page: Page) => page.evaluate(() => window.__soundStarts);
const techButton = (page: Page, name: string) =>
  page
    .getByRole("region", { name: "Tech stack", exact: true })
    .getByRole("button", { name, exact: true });
const soundToggle = (page: Page) => page.getByRole("button", { name: "Keyboard sound" });

test.describe("keyboard sound", () => {
  test.beforeEach(async ({ page }) => {
    await countSounds(page);
  });

  test("a technology button plays a keystroke, and muting silences it across reloads", async ({
    page,
  }) => {
    await page.goto("/en");
    await expect(soundToggle(page)).toHaveAttribute("aria-pressed", "true");

    await techButton(page, "React").click();
    // Press (3 layers) + release (2 layers) 70 ms later.
    await expect.poll(() => sounds(page)).toBe(5);

    await soundToggle(page).click();
    await expect(soundToggle(page)).toHaveAttribute("aria-pressed", "false");
    await techButton(page, "C#").click();
    await page.waitForTimeout(200);
    expect(await sounds(page)).toBe(5);

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-sound", "off");
    await expect(soundToggle(page)).toHaveAttribute("aria-pressed", "false");
  });

  test("a real key over the keyboard sounds down and up", async ({ page }) => {
    await page.goto("/en");
    await page.getByTestId("keyboard-stage").hover({ position: { x: 5, y: 5 } });

    await page.keyboard.down("KeyR");
    await expect.poll(() => sounds(page)).toBe(3);
    await page.keyboard.up("KeyR");
    await expect.poll(() => sounds(page)).toBe(5);
  });

  test("nothing sounds before the visitor has clicked, tapped or typed", async ({ page }) => {
    await page.goto("/en");

    // Hovering is no user activation: browsers would block the audio, so the site doesn't even try.
    await page.getByTestId("keyboard-stage").hover();
    await page.waitForTimeout(200);

    expect(await sounds(page)).toBe(0);
  });

  for (const locale of ["fa", "en"]) {
    test(`the header fits at 360px with the sound switch (${locale})`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await page.goto(`/${locale}`);

      await expect(
        page.locator("header").getByRole("button", { name: /sound|صدا/i }),
      ).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    });
  }
});
