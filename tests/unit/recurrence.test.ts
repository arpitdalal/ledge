import { describe, expect, it } from "vitest";

import {
  aggregateCashFlow,
  computeOccurrenceDates,
  fromScheduledDateKey,
  generateOccurrences,
  nextOccurrenceAfter,
  previewRuleOccurrences,
  scheduledDateKey,
  type RecurrenceRuleInput
} from "@/lib/domain/recurring/recurrence";

function buildRule(overrides: Partial<RecurrenceRuleInput> = {}): RecurrenceRuleInput {
  return {
    id: "rule-1",
    type: "EXPENSE",
    amount: 10000,
    payee: "Harrington Lofts",
    note: null,
    paymentMethod: null,
    categoryId: "rent",
    frequency: "MONTHLY",
    startDate: new Date("2026-04-02T12:00:00"),
    endDate: null,
    status: "ACTIVE",
    ...overrides
  };
}

function dateKeys(dates: Date[]) {
  return dates.map(scheduledDateKey);
}

describe("recurrence generation", () => {
  it("computes weekly occurrences across the horizon", () => {
    const rule = buildRule({ frequency: "WEEKLY", startDate: new Date("2026-04-01T12:00:00") });
    const dates = computeOccurrenceDates(
      rule,
      new Date("2026-04-01T00:00:00"),
      new Date("2026-05-01T00:00:00")
    );
    expect(dateKeys(dates)).toEqual([
      "2026-04-01",
      "2026-04-08",
      "2026-04-15",
      "2026-04-22",
      "2026-04-29"
    ]);
  });

  it("computes biweekly occurrences", () => {
    const rule = buildRule({ frequency: "BIWEEKLY", startDate: new Date("2026-04-01T12:00:00") });
    const dates = computeOccurrenceDates(
      rule,
      new Date("2026-04-01T00:00:00"),
      new Date("2026-06-01T00:00:00")
    );
    expect(dateKeys(dates)).toEqual(["2026-04-01", "2026-04-15", "2026-04-29", "2026-05-13", "2026-05-27"]);
  });

  it("handles monthly start on the 31st across short months", () => {
    const rule = buildRule({ frequency: "MONTHLY", startDate: new Date("2026-01-31T12:00:00") });
    const dates = computeOccurrenceDates(
      rule,
      new Date("2026-01-01T00:00:00"),
      new Date("2026-07-01T00:00:00")
    );
    expect(dateKeys(dates)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
      "2026-06-30"
    ]);
  });

  it("handles monthly start on the 29th/30th preserving anchor day when possible", () => {
    const rule = buildRule({ frequency: "MONTHLY", startDate: new Date("2026-01-30T12:00:00") });
    const dates = computeOccurrenceDates(
      rule,
      new Date("2026-01-01T00:00:00"),
      new Date("2026-04-15T00:00:00")
    );
    expect(dateKeys(dates)).toEqual(["2026-01-30", "2026-02-28", "2026-03-30"]);
  });

  it("handles yearly leap-day recurrence gracefully", () => {
    const rule = buildRule({
      frequency: "YEARLY",
      startDate: new Date("2024-02-29T12:00:00")
    });
    const dates = computeOccurrenceDates(
      rule,
      new Date("2024-01-01T00:00:00"),
      new Date("2028-04-01T00:00:00")
    );
    expect(dateKeys(dates)).toEqual(["2024-02-29", "2025-02-28", "2026-02-28", "2027-02-28", "2028-02-29"]);
  });

  it("truncates to end date", () => {
    const rule = buildRule({
      frequency: "MONTHLY",
      startDate: new Date("2026-04-01T12:00:00"),
      endDate: new Date("2026-06-01T12:00:00")
    });
    const dates = computeOccurrenceDates(
      rule,
      new Date("2026-04-01T00:00:00"),
      new Date("2026-12-01T00:00:00")
    );
    expect(dateKeys(dates)).toEqual(["2026-04-01", "2026-05-01", "2026-06-01"]);
  });

  it("returns no occurrences for paused or ended rules", () => {
    const paused = buildRule({ status: "PAUSED" });
    const ended = buildRule({ status: "ENDED" });
    const window = [new Date("2026-04-01T00:00:00"), new Date("2026-12-01T00:00:00")] as const;
    expect(computeOccurrenceDates(paused, window[0], window[1])).toEqual([]);
    expect(computeOccurrenceDates(ended, window[0], window[1])).toEqual([]);
  });

  it("fast-forwards past start date when horizon starts later", () => {
    const rule = buildRule({
      frequency: "WEEKLY",
      startDate: new Date("2026-01-07T12:00:00")
    });
    const dates = computeOccurrenceDates(
      rule,
      new Date("2026-03-01T00:00:00"),
      new Date("2026-03-29T00:00:00")
    );
    expect(dateKeys(dates)).toEqual(["2026-03-04", "2026-03-11", "2026-03-18", "2026-03-25"]);
  });

  it("respects maxCount when supplied", () => {
    const rule = buildRule({ frequency: "WEEKLY" });
    const dates = computeOccurrenceDates(
      rule,
      rule.startDate,
      new Date("2030-01-01T00:00:00"),
      { maxCount: 3 }
    );
    expect(dates).toHaveLength(3);
  });
});

describe("exception merging", () => {
  const baseRule = buildRule({
    frequency: "MONTHLY",
    startDate: new Date("2026-04-02T12:00:00")
  });

  it("removes skipped occurrences and preserves later ones", () => {
    const exceptions = [
      {
        scheduledDate: new Date("2026-05-02T12:00:00"),
        kind: "SKIPPED",
        amount: null,
        payee: null,
        note: null,
        paymentMethod: null,
        date: null,
        categoryId: null
      }
    ];
    const occurrences = generateOccurrences(
      baseRule,
      exceptions,
      new Date("2026-04-01T00:00:00"),
      new Date("2026-08-01T00:00:00")
    );
    expect(occurrences.map((occurrence) => scheduledDateKey(occurrence.scheduledDate))).toEqual([
      "2026-04-02",
      "2026-06-02",
      "2026-07-02"
    ]);
  });

  it("applies edited overrides only to the matching occurrence", () => {
    const exceptions = [
      {
        scheduledDate: new Date("2026-05-02T12:00:00"),
        kind: "EDITED",
        amount: 12000,
        payee: "Rent (adjusted)",
        note: "One-off reschedule",
        paymentMethod: null,
        date: new Date("2026-05-10T12:00:00"),
        categoryId: null
      }
    ];
    const occurrences = generateOccurrences(
      baseRule,
      exceptions,
      new Date("2026-04-01T00:00:00"),
      new Date("2026-08-01T00:00:00")
    );
    const edited = occurrences.find((occurrence) => occurrence.status === "EDITED");
    expect(edited).toMatchObject({
      amount: 12000,
      payee: "Rent (adjusted)",
      note: "One-off reschedule"
    });
    expect(scheduledDateKey(edited!.date)).toBe("2026-05-10");

    const later = occurrences.find(
      (occurrence) => scheduledDateKey(occurrence.scheduledDate) === "2026-06-02"
    );
    expect(later).toMatchObject({
      amount: baseRule.amount,
      payee: baseRule.payee,
      status: "UPCOMING"
    });
  });
});

describe("preview and next occurrence helpers", () => {
  it("previews future occurrences from today when rule started in the past", () => {
    const rule = buildRule({
      frequency: "MONTHLY",
      startDate: new Date("2025-01-02T12:00:00")
    });
    const preview = previewRuleOccurrences(rule, 3, new Date("2026-04-10T00:00:00"));
    expect(dateKeys(preview)).toEqual(["2026-05-02", "2026-06-02", "2026-07-02"]);
  });

  it("previews from the rule start if start is in the future", () => {
    const rule = buildRule({
      frequency: "MONTHLY",
      startDate: new Date("2027-01-02T12:00:00")
    });
    const preview = previewRuleOccurrences(rule, 2, new Date("2026-04-10T00:00:00"));
    expect(dateKeys(preview)).toEqual(["2027-01-02", "2027-02-02"]);
  });

  it("returns the next occurrence skipping exceptions", () => {
    const rule = buildRule({
      frequency: "MONTHLY",
      startDate: new Date("2026-04-02T12:00:00")
    });
    const exceptions = [
      {
        scheduledDate: new Date("2026-05-02T12:00:00"),
        kind: "SKIPPED",
        amount: null,
        payee: null,
        note: null,
        paymentMethod: null,
        date: null,
        categoryId: null
      }
    ];
    const next = nextOccurrenceAfter(rule, exceptions, new Date("2026-04-15T00:00:00"));
    expect(next && scheduledDateKey(next.date)).toBe("2026-06-02");
  });
});

describe("cash flow aggregation", () => {
  it("sums income, expenses, and net across occurrences", () => {
    const rule = buildRule({ frequency: "WEEKLY", startDate: new Date("2026-04-01T12:00:00") });
    const income = buildRule({ id: "rule-2", type: "INCOME", amount: 500000, frequency: "BIWEEKLY" });
    const occurrences = [
      ...generateOccurrences(rule, [], new Date("2026-04-01T00:00:00"), new Date("2026-04-15T00:00:00")),
      ...generateOccurrences(income, [], new Date("2026-04-01T00:00:00"), new Date("2026-04-15T00:00:00"))
    ];

    const summary = aggregateCashFlow(occurrences);
    expect(summary.income).toBeGreaterThan(0);
    expect(summary.expenses).toBeGreaterThan(0);
    expect(summary.net).toBe(summary.income - summary.expenses);
    expect(summary.count).toBe(occurrences.length);
  });
});

describe("scheduled date helpers", () => {
  it("round-trips through key/string conversion", () => {
    const date = new Date("2024-02-29T12:00:00");
    const key = scheduledDateKey(date);
    expect(key).toBe("2024-02-29");
    const round = fromScheduledDateKey(key);
    expect(round.getFullYear()).toBe(2024);
    expect(round.getMonth()).toBe(1);
    expect(round.getDate()).toBe(29);
  });
});
