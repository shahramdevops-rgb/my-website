import { expect, type Locator, type Page, test } from "@playwright/test";

const mobile = { width: 360, height: 740 };
const desktop = { width: 1440, height: 900 };

// Card names (their headings) on /en; the hero is named by the site name from e2e/mock-api.ts.
const cards = {
  hero: "e2e test name",
  stack: "Tech stack",
  hiring: "See how I work",
  project: "Let's build it together",
  projects: "Featured projects",
  demo: "Live demo",
  posts: "Latest posts",
} as const;

async function box(locator: Locator) {
  const rect = await locator.boundingBox();
  // null only for an element that isn't rendered.
  if (!rect) throw new Error(`${locator.toString()} is not rendered.`);
  return rect;
}

const card = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

test.describe("home Bento grid", () => {
  test("at 360 px every card is full width, in reading order, with no sideways scroll", async ({
    page,
  }) => {
    await page.setViewportSize(mobile);
    await page.goto("/en");

    const boxes = await Promise.all(Object.values(cards).map((name) => box(card(page, name))));
    for (const [index, rect] of boxes.entries()) {
      expect(rect.x).toBe(boxes[0]?.x);
      expect(rect.width).toBe(boxes[0]?.width);
      if (index > 0) expect(rect.y).toBeGreaterThan(boxes[index - 1]?.y ?? 0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      mobile.width,
    );
  });

  test("at 1440 px cards pair up in rows: hero + keyboard, the two paths, projects + demo + posts", async ({
    page,
  }) => {
    await page.setViewportSize(desktop);
    await page.goto("/en");

    const [hero, stack, hiring, project, projects, demo, posts] = await Promise.all(
      Object.values(cards).map((name) => box(card(page, name))),
    );

    expect(stack?.y).toBe(hero?.y);
    expect(project?.y).toBe(hiring?.y);
    expect(demo?.y).toBe(projects?.y);
    expect(posts?.y).toBe(projects?.y);
    expect(hiring?.y).toBeGreaterThan(hero?.y ?? 0);
  });

  test("in Persian the grid mirrors: the hero starts on the right", async ({ page }) => {
    await page.setViewportSize(desktop);
    await page.goto("/fa");

    const hero = await box(page.getByRole("region", { name: "نام آزمایشی e2e" }));
    const stack = await box(page.getByRole("region", { name: "پشته فنی" }));
    expect(hero.x).toBeGreaterThan(stack.x);
  });

  test("the two audience paths lead to their pages", async ({ page }) => {
    await page.goto("/en");

    const hiring = card(page, cards.hiring);
    await expect(hiring.getByRole("link", { name: "Resume" })).toHaveAttribute(
      "href",
      "/en/resume",
    );
    const project = card(page, cards.project);
    await expect(project.getByRole("link", { name: "Start a project" })).toHaveAttribute(
      "href",
      "/en/contact?type=project",
    );
  });

  test("shows the résumé's headline and tech stack from the API", async ({ page }) => {
    await page.goto("/fa");

    await expect(page.getByText("عنوان آزمایشی e2e")).toBeVisible();
    const stack = page.getByRole("region", { name: "پشته فنی" });
    const names = await stack
      .getByRole("button")
      .evaluateAll((buttons) => buttons.map((button) => button.querySelector("span")?.textContent));
    expect(names).toEqual(["C#", ".NET", "React"]);
  });
});
