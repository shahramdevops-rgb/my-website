import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/lib/i18n/config";
import type { Resume } from "@/lib/resume/get-resume";
import type { SiteInfo } from "@/lib/site/get-site-info";
import en from "../../../messages/en.json";
import fa from "../../../messages/fa.json";
import HomePage from "./page";

const site: SiteInfo = {
  name: { fa: "نام آزمایشی", en: "Test Name" },
  social: { email: null, gitHub: null, telegram: null },
  features: { newsletterSignup: false, comments: false, analytics: false, semanticSearch: false },
};

const resume: Resume = {
  basics: {
    name: "Test Name",
    headline: "Test headline",
    summary: "Test summary",
    location: "Test",
  },
  links: [],
  experience: [],
  education: [],
  skills: [],
  techStack: [
    { id: "csharp", name: "C#", description: "C# description" },
    { id: "postgresql", name: "PostgreSQL", description: "PostgreSQL description" },
  ],
};

// The page's data and Next.js request APIs are replaced, so the test checks only what the page renders.
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next-intl/server", () => ({ setRequestLocale: () => {}, getTranslations: vi.fn() }));
vi.mock("@/lib/site/get-site-info", () => ({ getSiteInfo: async () => site }));
vi.mock("@/lib/resume/get-resume", () => ({ getResume: async () => resume }));

const messages = { fa, en };

// jsdom has no matchMedia; the grid asks it whether to run the cursor spotlight. A touch screen: no spotlight.
beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    media: query,
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

// An async Server Component is a function that returns JSX: await it, then render the result. The provider gives
// the cards their messages, as next-intl does on the server.
async function renderHome(locale: Locale) {
  const page = await HomePage({
    params: Promise.resolve({ locale }),
    searchParams: Promise.resolve({}),
  });
  render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      {page}
    </NextIntlClientProvider>,
  );
}

describe("HomePage", () => {
  it.each([
    ["fa", "نام آزمایشی"],
    ["en", "Test Name"],
  ] as const)(
    "shows the %s site name from the API as the only top-level heading",
    async (locale, name) => {
      await renderHome(locale);

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(name);
    },
  );

  it("introduces the name with the résumé's headline, the single source of that line", async () => {
    await renderHome("en");

    const hero = screen.getByRole("region", { name: "Test Name" });
    expect(within(hero).getByText("Test headline")).toBeInTheDocument();
  });

  it("lists the résumé's tech stack in the keyboard slot", async () => {
    await renderHome("en");

    const stack = screen.getByRole("region", { name: "Tech stack" });
    expect(
      within(stack)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["C#", "PostgreSQL"]);
  });

  it("sends employers to the résumé and the engineering decisions", async () => {
    await renderHome("fa");

    const hiring = screen.getByRole("region", { name: "ببینید چطور کار می‌کنم" });
    expect(within(hiring).getByRole("link", { name: "رزومه" })).toHaveAttribute(
      "href",
      "/fa/resume",
    );
    expect(within(hiring).getByRole("link", { name: "تصمیم‌های مهندسی" })).toHaveAttribute(
      "href",
      "/fa/decisions",
    );
  });

  it("sends clients to the contact form with the project type chosen, and to the services", async () => {
    await renderHome("en");

    const project = screen.getByRole("region", { name: "Let's build it together" });
    expect(within(project).getByRole("link", { name: "Start a project" })).toHaveAttribute(
      "href",
      "/en/contact?type=project",
    );
    expect(within(project).getByRole("link", { name: "Services" })).toHaveAttribute(
      "href",
      "/en/services",
    );
  });

  it.each(["Featured projects", "Live demo", "Latest posts"])(
    "marks the %s card as in progress instead of showing sample data",
    async (title) => {
      await renderHome("en");

      expect(
        within(screen.getByRole("region", { name: title })).getByText("In progress"),
      ).toBeInTheDocument();
    },
  );
});
