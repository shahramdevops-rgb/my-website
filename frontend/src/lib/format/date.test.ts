import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatRelative, formatYear, formatYearMonth } from "./date";

// Vectors carried over from P1's DateDisplayTests (commit fe205aa).
const now = new Date("2026-07-01T12:00:00Z");
const secondsAgo = (seconds: number) => new Date(now.getTime() - seconds * 1000);

describe("formatDate", () => {
  it("renders the Persian date with Persian digits", () => {
    // 20:00 UTC = 23:30 in Tehran: still the last day of 1404.
    expect(formatDate("2026-03-20T20:00:00Z", "fa")).toBe("۲۹ اسفند ۱۴۰۴");
  });

  it("uses the Tehran day when UTC is still the day before", () => {
    // 20:31 UTC = 00:01 on 21 March in Tehran (UTC+3:30): Nowruz.
    expect(formatDate("2026-03-20T20:31:00Z", "fa")).toBe("۱ فروردین ۱۴۰۵");
    expect(formatDate("2026-03-20T20:31:00Z", "en")).toBe("March 21, 2026");
  });
});

describe("formatDateTime", () => {
  it("uses UTC+3:30 in summer too (Iran dropped daylight saving time in 2022)", () => {
    // 12:00 UTC → 15:30, not 16:30. P1 wrote "۱۰ تیر ۱۴۰۵، ۱۵:۳۰"; Intl's Persian pattern uses «ساعت».
    expect(formatDateTime("2026-07-01T12:00:00Z", "fa")).toBe("۱۰ تیر ۱۴۰۵ ساعت ۱۵:۳۰");
    expect(formatDateTime("2026-07-01T12:00:00Z", "en")).toBe("July 1, 2026 at 15:30");
  });
});

describe("formatYear", () => {
  it("returns the year of the locale's calendar", () => {
    expect(formatYear(now, "fa")).toBe("۱۴۰۵");
    expect(formatYear(now, "en")).toBe("2026");
  });
});

describe("formatYearMonth", () => {
  it.each([
    ["2020-09", "شهریور ۱۳۹۹", "September 2020"],
    ["2000-01", "دی ۱۳۷۸", "January 2000"],
    ["2026-03", "اسفند ۱۴۰۴", "March 2026"],
  ])("%s → %s / %s", (value, fa, en) => {
    expect(formatYearMonth(value, "fa")).toBe(fa);
    expect(formatYearMonth(value, "en")).toBe(en);
  });

  it.each(["2020", "2020-13", "2020-9", "2020-09-01"])("rejects %s", (value) => {
    expect(() => formatYearMonth(value, "en")).toThrow();
  });
});

describe("formatRelative", () => {
  it.each([
    [30, "همین الان"],
    [5 * 60, "۵ دقیقه پیش"],
    [3 * 3600, "۳ ساعت پیش"],
    [3 * 86_400, "۳ روز پیش"],
    [40 * 86_400, "۱ خرداد ۱۴۰۵"], // older than 30 days → the date
    [-3600, "۱۰ تیر ۱۴۰۵"], // future → the date
  ])("fa: %i seconds ago → %s", (seconds, expected) => {
    const options = { locale: "fa", now, justNow: "همین الان" } as const;
    expect(formatRelative(secondsAgo(seconds), options)).toBe(expected);
  });

  it.each([
    [30, "just now"],
    [5 * 60, "5 minutes ago"],
    [3 * 86_400, "3 days ago"],
  ])("en: %i seconds ago → %s", (seconds, expected) => {
    const options = { locale: "en", now, justNow: "just now" } as const;
    expect(formatRelative(secondsAgo(seconds), options)).toBe(expected);
  });
});
