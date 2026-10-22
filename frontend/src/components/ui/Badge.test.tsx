import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fa from "../../../messages/fa.json";
import { Badge } from "./Badge";

describe("Badge", () => {
  it.each([
    ["en", en, "inProgress", "In progress"],
    ["fa", fa, "live", "آنلاین"],
  ] as const)("names the status in words (%s)", (locale, messages, status, text) => {
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <Badge status={status} />
      </NextIntlClientProvider>,
    );

    // The dot is decoration: the accessible text is the word alone.
    expect(screen.getByText(text)).toHaveTextContent(new RegExp(`^${text}$`));
  });
});
