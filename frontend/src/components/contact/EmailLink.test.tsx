import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { encodeEmail } from "@/lib/contact/email";
import { EmailLink } from "./EmailLink";

const encoded = encodeEmail("e2e@example.com");

describe("EmailLink", () => {
  it("in the browser is a mailto link that shows the address", () => {
    render(<EmailLink encoded={encoded} obfuscated="e2e [at] example.com" />);

    const link = screen.getByRole("link", { name: "e2e@example.com" });
    expect(link).toHaveAttribute("href", "mailto:e2e@example.com");
    expect(link).toHaveAttribute("dir", "ltr");
  });

  it("keeps a fixed label", () => {
    render(<EmailLink encoded={encoded} label="Email" />);

    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute(
      "href",
      "mailto:e2e@example.com",
    );
  });

  it("on the server writes only the fallback, never the address", () => {
    const html = renderToString(
      <EmailLink encoded={encoded} obfuscated="e2e [at] example.com" fallbackHref="/en/contact" />,
    );

    expect(html).toContain("e2e [at] example.com");
    expect(html).toContain('href="/en/contact"');
    expect(html).not.toContain("e2e@example.com");
    expect(html).not.toContain("mailto:");
  });
});
