import { addDays, addMonths, addYears, isAfter, isBefore, startOfDay } from "date-fns";

import type {
  RecurrenceFrequency,
  RecurringOccurrenceKind,
  RecurringRuleStatus
} from "@/lib/domain/constants";

export type RecurrenceRuleInput = {
  id: string;
  type: "INCOME" | "EXPENSE" | string;
  amount: number;
  payee: string;
  note: string | null;
  paymentMethod: string | null;
  categoryId: string;
  frequency: RecurrenceFrequency | string;
  startDate: Date;
  endDate: Date | null;
  status: RecurringRuleStatus | string;
};

export type OccurrenceExceptionInput = {
  scheduledDate: Date;
  kind: RecurringOccurrenceKind | string;
  amount: number | null;
  payee: string | null;
  note: string | null;
  paymentMethod: string | null;
  date: Date | null;
  categoryId: string | null;
};

export type GeneratedOccurrence = {
  ruleId: string;
  scheduledDate: Date;
  date: Date;
  type: string;
  amount: number;
  payee: string;
  note: string | null;
  paymentMethod: string | null;
  categoryId: string;
  status: "UPCOMING" | "EDITED";
};

/**
 * Canonical yyyy-mm-dd key used to compare scheduled dates without TZ drift.
 */
export function scheduledDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromScheduledDateKey(key: string) {
  return new Date(`${key}T12:00:00`);
}

export function parseDateInput(value: string) {
  return new Date(`${value}T12:00:00`);
}

/**
 * Last day of the target month, 1-31.
 */
function lastDayOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Advances a date by {count} months, clamping to the last day of the target
 * month if the anchor day does not exist (e.g. Jan 31 -> Feb 28/29).
 * The nominal anchor day is preserved separately by the caller.
 */
function shiftToMonth(anchorDay: number, year: number, monthIndex: number) {
  const day = Math.min(anchorDay, lastDayOfMonth(year, monthIndex));
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

/**
 * Generates all scheduled occurrence dates for a rule within [from, to].
 *
 * Notes:
 * - Paused or ended rules produce no occurrences.
 * - Start date may fall before `from`; we fast-forward without losing the
 *   rule's month/day anchor for monthly/yearly cadences.
 * - Monthly/yearly preserve the nominal anchor day across short months and
 *   leap-day feb 29 by clamping to that month's last day.
 */
export function computeOccurrenceDates(
  rule: RecurrenceRuleInput,
  from: Date,
  to: Date,
  options: { maxCount?: number } = {}
): Date[] {
  if (rule.status !== "ACTIVE") return [];
  if (!Number.isFinite(rule.startDate.getTime())) return [];
  if (isAfter(rule.startDate, to)) return [];

  const maxCount = options.maxCount ?? Infinity;
  const horizonEnd = rule.endDate && isBefore(rule.endDate, to) ? rule.endDate : to;

  const results: Date[] = [];
  const start = new Date(rule.startDate.getFullYear(), rule.startDate.getMonth(), rule.startDate.getDate(), 12, 0, 0, 0);

  if (rule.frequency === "WEEKLY" || rule.frequency === "BIWEEKLY") {
    const step = rule.frequency === "WEEKLY" ? 7 : 14;
    let cursor = start;
    while (cursor < from && !sameDay(cursor, from)) {
      cursor = addDays(cursor, step);
    }
    while (cursor <= horizonEnd && results.length < maxCount) {
      if (cursor >= from || sameDay(cursor, from)) {
        results.push(cursor);
      }
      cursor = addDays(cursor, step);
    }
    return results;
  }

  if (rule.frequency === "MONTHLY") {
    const anchorDay = rule.startDate.getDate();
    let year = start.getFullYear();
    let monthIndex = start.getMonth();

    while (results.length < maxCount) {
      const slot = shiftToMonth(anchorDay, year, monthIndex);
      if (slot > horizonEnd) break;
      if ((slot >= from || sameDay(slot, from)) && slot >= start) {
        results.push(slot);
      }
      monthIndex += 1;
      if (monthIndex > 11) {
        monthIndex = 0;
        year += 1;
      }
    }
    return results;
  }

  if (rule.frequency === "YEARLY") {
    const anchorDay = rule.startDate.getDate();
    const anchorMonth = rule.startDate.getMonth();
    let year = start.getFullYear();

    while (results.length < maxCount) {
      const slot = shiftToMonth(anchorDay, year, anchorMonth);
      if (slot > horizonEnd) break;
      if ((slot >= from || sameDay(slot, from)) && slot >= start) {
        results.push(slot);
      }
      year += 1;
    }
    return results;
  }

  return results;
}

/**
 * Materialize occurrences for a rule, applying exception rows.
 *
 * - SKIPPED exceptions remove the slot.
 * - EDITED exceptions replace the generated fields for that slot only.
 *
 * The returned list is sorted chronologically by the effective date.
 */
export function generateOccurrences(
  rule: RecurrenceRuleInput,
  exceptions: OccurrenceExceptionInput[],
  from: Date,
  to: Date,
  options: { maxCount?: number } = {}
): GeneratedOccurrence[] {
  const scheduledDates = computeOccurrenceDates(rule, from, to, options);
  const exceptionByKey = new Map(
    exceptions.map((exception) => [scheduledDateKey(exception.scheduledDate), exception])
  );

  const occurrences: GeneratedOccurrence[] = [];

  for (const scheduled of scheduledDates) {
    const key = scheduledDateKey(scheduled);
    const exception = exceptionByKey.get(key);

    if (exception?.kind === "SKIPPED") continue;

    if (exception?.kind === "EDITED") {
      occurrences.push({
        ruleId: rule.id,
        scheduledDate: scheduled,
        date: exception.date ?? scheduled,
        type: rule.type,
        amount: exception.amount ?? rule.amount,
        payee: exception.payee ?? rule.payee,
        note: exception.note ?? rule.note,
        paymentMethod: exception.paymentMethod ?? rule.paymentMethod,
        categoryId: exception.categoryId ?? rule.categoryId,
        status: "EDITED"
      });
      continue;
    }

    occurrences.push({
      ruleId: rule.id,
      scheduledDate: scheduled,
      date: scheduled,
      type: rule.type,
      amount: rule.amount,
      payee: rule.payee,
      note: rule.note,
      paymentMethod: rule.paymentMethod,
      categoryId: rule.categoryId,
      status: "UPCOMING"
    });
  }

  return occurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Preview the next `count` occurrences for a rule, ignoring exceptions.
 * Useful for the create/edit form's preview.
 */
export function previewRuleOccurrences(
  rule: RecurrenceRuleInput,
  count: number,
  fromDate: Date = new Date()
): Date[] {
  const from = startOfDay(fromDate);
  const horizonEnd = rule.endDate ?? addYears(from, 5);
  const searchStart = isBefore(from, rule.startDate) ? rule.startDate : from;
  return computeOccurrenceDates(rule, searchStart, horizonEnd, { maxCount: count });
}

export function nextOccurrenceAfter(
  rule: RecurrenceRuleInput,
  exceptions: OccurrenceExceptionInput[],
  fromDate: Date = new Date()
): GeneratedOccurrence | null {
  const from = startOfDay(fromDate);
  const horizonEnd = rule.endDate ?? addYears(from, 5);
  const searchStart = isBefore(from, rule.startDate) ? rule.startDate : from;
  const skippedCount = exceptions.filter((exception) => exception.kind === "SKIPPED").length;
  const occurrences = generateOccurrences(rule, exceptions, searchStart, horizonEnd, {
    maxCount: skippedCount + 1
  });
  return occurrences[0] ?? null;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Cash-flow aggregation for a set of generated occurrences.
 */
export function aggregateCashFlow(occurrences: GeneratedOccurrence[]) {
  const income = occurrences
    .filter((occurrence) => occurrence.type === "INCOME")
    .reduce((sum, item) => sum + item.amount, 0);
  const expenses = occurrences
    .filter((occurrence) => occurrence.type === "EXPENSE")
    .reduce((sum, item) => sum + item.amount, 0);
  return {
    income,
    expenses,
    net: income - expenses,
    count: occurrences.length
  };
}

/**
 * Guard used before promoting a rule to ACTIVE that it has at least one
 * upcoming slot. Callers may still allow ENDED rules (no upcoming).
 */
export function hasFutureOccurrences(
  rule: RecurrenceRuleInput,
  fromDate: Date = new Date()
) {
  return previewRuleOccurrences(rule, 1, fromDate).length > 0;
}

export { addDays, addMonths, addYears };
