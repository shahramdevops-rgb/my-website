import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageSwitcher } from "./LanguageSwitcher";

// The URL of the current page, as Next's router would report it.
const url = vi.hoisted(() => ({ pathname: "/fa/blog/my-post", search: "tag=dotnet" }));
vi.mock(import("next/navigation"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    usePathname: () => url.pathname,
    useSearchParams: () => new actual.ReadonlyURLSearchParams(url.search),
  };
});

afterEach(() => {
  document.cookie = "lang=; Path=/; Max-Age=0";
});

function renderSwitcher() {
  render(
    <NextIntlClientProvider locale="fa">
      <LanguageSwitcher locale="fa" label="English" />
    </NextIntlClientProvider>,
  );
  return screen.getByRole("link", { name: "English" });
}

describe("LanguageSwitcher", () => {
  it("links to the same page and query in the other language", () => {
    const link = renderSwitcher();

    expect(link).toHaveAttribute("href", "/en/blog/my-post?tag=dotnet");
    expect(link).toHaveAttribute("hreflang", "en");
    expect(link).toHaveAttribute("lang", "en");
  });

  it("remembers the choice when clicked", () => {
    const link = renderSwitcher();
    // jsdom doesn't navigate; stop the default action so it doesn't log "not implemented".
    link.addEventListener("click", (event) => event.preventDefault());

    fireEvent.click(link);

    expect(document.cookie).toContain("lang=en");
  });
});
