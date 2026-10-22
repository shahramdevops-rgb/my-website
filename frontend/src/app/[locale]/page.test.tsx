import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SiteInfo } from "@/lib/site/get-site-info";
import HomePage from "./page";

const site: SiteInfo = {
  name: { fa: "نام آزمایشی", en: "Test Name" },
  social: { email: null, gitHub: null, telegram: null },
  features: { newsletterSignup: false, comments: false, analytics: false, semanticSearch: false },
};

// The page's data and Next.js request APIs are replaced, so the test checks only what the page renders.
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next-intl/server", () => ({
  setRequestLocale: () => {},
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/site/get-site-info", () => ({ getSiteInfo: async () => site }));

describe("HomePage", () => {
  it.each([
    ["fa", "نام آزمایشی"],
    ["en", "Test Name"],
  ])("shows the %s site name from the API as the only top-level heading", async (locale, name) => {
    // An async Server Component is a function that returns JSX: await it, then render the result.
    render(
      await HomePage({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({}) }),
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(name);
  });
});
