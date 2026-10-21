import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fa from "../../../messages/fa.json";
import { formatNumber } from "./number";
import { readingMinutes } from "./reading-time";

// Vectors carried over from P1's NumberDisplayTests (commit fe205aa).
describe("formatNumber", () => {
  it("uses Persian digits and separators in fa", () => {
    expect(formatNumber(1234567, "fa")).toBe("۱٬۲۳۴٬۵۶۷");
    expect(formatNumber(12.5, "fa", { minimumFractionDigits: 1 })).toBe("۱۲٫۵");
  });

  it("uses Latin digits in en", () => {
    expect(formatNumber(1234567, "en")).toBe("1,234,567");
  });
});

describe("reading time", () => {
  const faT = createTranslator({ locale: "fa", messages: fa });
  const enT = createTranslator({ locale: "en", messages: en });

  it.each([
    [5, "۵ دقیقه مطالعه"],
    [0, "۱ دقیقه مطالعه"],
  ])("fa: %i minutes → %s", (minutes, expected) => {
    expect(faT("format.readingTime", { minutes: readingMinutes(minutes) })).toBe(expected);
  });

  it("en: 5 minutes → 5 min read", () => {
    expect(enT("format.readingTime", { minutes: readingMinutes(5) })).toBe("5 min read");
  });
});
