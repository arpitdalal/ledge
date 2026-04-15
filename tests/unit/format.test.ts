import { describe, expect, it } from "vitest";

import { formatCurrency, parseCurrencyToCents } from "@/lib/domain/format/currency";
import { formatDate, formatMonthLabel, toDateInputValue } from "@/lib/domain/format/date";

describe("format helpers", () => {
  it("formats cents as localized currency", () => {
    expect(formatCurrency(123456, "CAD", "en-CA")).toBe("$1,234.56");
  });

  it("parses currency input into cents", () => {
    expect(parseCurrencyToCents("$1,234.56")).toBe(123456);
    expect(parseCurrencyToCents("1.234,56")).toBe(123456);
    expect(parseCurrencyToCents("12,34")).toBe(1234);
    expect(parseCurrencyToCents("19.9")).toBe(1990);
    expect(parseCurrencyToCents(19.995)).toBe(2000);
    expect(parseCurrencyToCents("not money")).toBeNaN();
  });

  it("formats dates predictably", () => {
    const date = new Date("2026-04-15T12:00:00");
    expect(formatDate(date)).toBe("Apr 15, 2026");
    expect(formatDate(date, "yyyy/MM/dd")).toBe("2026/04/15");
    expect(formatMonthLabel(date)).toBe("Apr 2026");
    expect(toDateInputValue(date)).toBe("2026-04-15");
  });
});
