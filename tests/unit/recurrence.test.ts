import { describe, expect, it } from "vitest";

import {
  generateOccurrences,
  isRuleEnded,
  nextOccurrenceAtOrAfter,
  occurrenceAtIndex,
  previewOccurrences
} from "@/lib/domain/recurring/recurrence";

function date(iso: string) {
  return new Date(`${iso}T12:00:00`);
}

function isoDay(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("recurrence occurrenceAtIndex", () => {
  it("produces weekly dates anchored to the start", () => {
    const start = date("2026-04-01");
    expect(isoDay(occurrenceAtIndex({ frequency: "WEEKLY", startDate: start }, 0))).toBe("2026-04-01");
    expect(isoDay(occurrenceAtIndex({ frequency: "WEEKLY", startDate: start }, 3))).toBe("2026-04-22");
  });

  it("produces biweekly dates 14 days apart", () => {
    const start = date("2026-04-01");
    expect(isoDay(occurrenceAtIndex({ frequency: "BIWEEKLY", startDate: start }, 2))).toBe("2026-04-29");
    expect(isoDay(occurrenceAtIndex({ frequency: "BIWEEKLY", startDate: start }, 4))).toBe("2026-05-27");
  });

  it("handles monthly start on the 31st by clamping to the last day of each target month", () => {
    const start = date("2026-01-31");
    expect(isoDay(occurrenceAtIndex({ frequency: "MONTHLY", startDate: start }, 1))).toBe("2026-02-28");
    expect(isoDay(occurrenceAtIndex({ frequency: "MONTHLY", startDate: start }, 2))).toBe("2026-03-31");
    expect(isoDay(occurrenceAtIndex({ frequency: "MONTHLY", startDate: start }, 3))).toBe("2026-04-30");
    expect(isoDay(occurrenceAtIndex({ frequency: "MONTHLY", startDate: start }, 4))).toBe("2026-05-31");
  });

  it("preserves the original day of month across clamps (anchored, not drifting)", () => {
    const start = date("2026-01-30");
    expect(isoDay(occurrenceAtIndex({ frequency: "MONTHLY", startDate: start }, 1))).toBe("2026-02-28");
    expect(isoDay(occurrenceAtIndex({ frequency: "MONTHLY", startDate: start }, 2))).toBe("2026-03-30");
  });

  it("handles leap year starts on Feb 29 by clamping to Feb 28 in non-leap years", () => {
    const start = date("2024-02-29");
    expect(isoDay(occurrenceAtIndex({ frequency: "YEARLY", startDate: start }, 1))).toBe("2025-02-28");
    expect(isoDay(occurrenceAtIndex({ frequency: "YEARLY", startDate: start }, 4))).toBe("2028-02-29");
  });
});

describe("generateOccurrences", () => {
  it("returns occurrences inside a weekly window", () => {
    const start = date("2026-04-01");
    const result = generateOccurrences(
      { frequency: "WEEKLY", startDate: start },
      date("2026-04-05"),
      date("2026-04-30")
    );
    expect(result.map(isoDay)).toEqual(["2026-04-08", "2026-04-15", "2026-04-22", "2026-04-29"]);
  });

  it("returns empty when horizon is before startDate", () => {
    const result = generateOccurrences(
      { frequency: "MONTHLY", startDate: date("2026-06-01") },
      date("2026-04-01"),
      date("2026-05-31")
    );
    expect(result).toEqual([]);
  });

  it("respects endDate and stops generating past it", () => {
    const result = generateOccurrences(
      {
        frequency: "MONTHLY",
        startDate: date("2026-01-15"),
        endDate: date("2026-04-01")
      },
      date("2026-01-01"),
      date("2026-12-31")
    );
    expect(result.map(isoDay)).toEqual(["2026-01-15", "2026-02-15", "2026-03-15"]);
  });

  it("stays stable for monthly-31 over a year window", () => {
    const result = generateOccurrences(
      { frequency: "MONTHLY", startDate: date("2026-01-31") },
      date("2026-01-01"),
      date("2026-12-31")
    );
    expect(result.map((item) => item.getMonth())).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(result.map(isoDay).slice(0, 4)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30"
    ]);
  });
});

describe("nextOccurrenceAtOrAfter", () => {
  it("returns the start date if from is before it", () => {
    const next = nextOccurrenceAtOrAfter(
      { frequency: "MONTHLY", startDate: date("2026-05-01") },
      date("2026-04-01")
    );
    expect(next && isoDay(next)).toBe("2026-05-01");
  });

  it("returns the next future occurrence", () => {
    const next = nextOccurrenceAtOrAfter(
      { frequency: "WEEKLY", startDate: date("2026-04-01") },
      date("2026-04-10")
    );
    expect(next && isoDay(next)).toBe("2026-04-15");
  });

  it("returns null after endDate", () => {
    const next = nextOccurrenceAtOrAfter(
      {
        frequency: "WEEKLY",
        startDate: date("2026-01-01"),
        endDate: date("2026-01-31")
      },
      date("2026-02-10")
    );
    expect(next).toBeNull();
  });
});

describe("previewOccurrences", () => {
  it("returns up to N dates from start", () => {
    const result = previewOccurrences(
      { frequency: "MONTHLY", startDate: date("2026-04-15") },
      3,
      date("2026-04-01")
    );
    expect(result.map(isoDay)).toEqual(["2026-04-15", "2026-05-15", "2026-06-15"]);
  });

  it("stops at endDate", () => {
    const result = previewOccurrences(
      {
        frequency: "MONTHLY",
        startDate: date("2026-04-15"),
        endDate: date("2026-05-20")
      },
      5,
      date("2026-04-01")
    );
    expect(result.map(isoDay)).toEqual(["2026-04-15", "2026-05-15"]);
  });
});

describe("isRuleEnded", () => {
  it("is false when endDate is in the future", () => {
    expect(
      isRuleEnded({ endDate: date("2099-01-01") }, date("2026-04-15"))
    ).toBe(false);
  });

  it("is true when endDate is strictly before today", () => {
    expect(
      isRuleEnded({ endDate: date("2026-04-10") }, date("2026-04-15"))
    ).toBe(true);
  });

  it("is false when endDate is null", () => {
    expect(isRuleEnded({ endDate: null }, date("2026-04-15"))).toBe(false);
  });
});
