import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SiteInfo } from "@/lib/site/get-site-info";
import HomePage from "./page";

const site: SiteInfo = {
  name: { fa: "نام آزمایشی", en: "Test Name" },
  social: { email: null, gitHub: null, telegram: null },
  features: { newsletterSignup: false, comments: false, analytics: false, semanticSearch: false },
};

// The page's data comes from the API; here it is replaced, so the test checks only what the page renders.
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/site/get-site-info", () => ({ getSiteInfo: async () => site }));

describe("HomePage", () => {
  it("shows the Persian site name from the API as the only top-level heading", async () => {
    // An async Server Component is a function that returns JSX: await it, then render the result.
    render(await HomePage());

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("نام آزمایشی");
  });
});
