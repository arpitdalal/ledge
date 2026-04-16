import { addDays, addMonths, addWeeks, addYears, isAfter, isBefore, isSameDay, startOfDay } from "date-fns";

import type { RecurringFrequency } from "@/lib/domain/constants";

export type RecurrenceInput = {
  frequency: RecurringFrequency;
  startDate: Date;
  endDate?: Date | null;
};

/**
 * Compute the nth occurrence date after (or equal to) startDate for the given frequency.
 *
 * Index 0 == startDate itself. Computation is always anchored to startDate rather than
 * iterated, so month-end edge cases (Jan 31 -> Feb 28 -> Mar 31) and leap year behaviour
 * (Feb 29 -> Feb 28 in non-leap years) stay stable across long horizons.
 */
export function occurrenceAtIndex({ frequency, startDate }: RecurrenceInput, index: number): Date {
  const anchor = startOfDay(startDate);
  switch (frequency) {
    case "WEEKLY":
      return addWeeks(anchor, index);
    case "BIWEEKLY":
      return addDays(anchor, index * 14);
    case "MONTHLY":
      return addMonths(anchor, index);
    case "YEARLY":
      return addYears(anchor, index);
  }
}

/**
 * Estimate an index close to (but not past) the target date so generation can start
 * there without iterating from index 0. Always returns >= 0.
 */
function estimateIndexAtOrBefore(rule: RecurrenceInput, target: Date): number {
  const start = startOfDay(rule.startDate);
  const ms = target.getTime() - start.getTime();
  if (ms <= 0) return 0;
  const day = 86_400_000;
  switch (rule.frequency) {
    case "WEEKLY":
      return Math.max(0, Math.floor(ms / (7 * day)));
    case "BIWEEKLY":
      return Math.max(0, Math.floor(ms / (14 * day)));
    case "MONTHLY": {
      const months =
        (target.getFullYear() - start.getFullYear()) * 12 +
        (target.getMonth() - start.getMonth());
      return Math.max(0, months - 1);
    }
    case "YEARLY": {
      const years = target.getFullYear() - start.getFullYear();
      return Math.max(0, years - 1);
    }
  }
}

/**
 * Generate every canonical occurrence of the rule whose scheduled date falls in
 * the inclusive `[from, to]` window. Occurrences past `endDate` (if set) are
 * excluded. Stable and deterministic.
 */
export function generateOccurrences(rule: RecurrenceInput, from: Date, to: Date): Date[] {
  if (isAfter(rule.startDate, to)) return [];
  const windowEnd = rule.endDate && isBefore(rule.endDate, to) ? rule.endDate : to;
  if (isBefore(windowEnd, from) && !isSameDay(windowEnd, from)) {
    if (!isSameDay(windowEnd, rule.startDate)) return [];
  }

  const results: Date[] = [];
  let index = estimateIndexAtOrBefore(rule, from);
  let guard = 0;
  const maxIterations = 10_000;

  while (guard < maxIterations) {
    const scheduled = occurrenceAtIndex(rule, index);
    if (rule.endDate && isAfter(scheduled, rule.endDate)) break;
    if (isAfter(scheduled, to)) break;

    if (!isBefore(scheduled, from)) {
      results.push(scheduled);
    }
    index += 1;
    guard += 1;
  }

  return results;
}

/**
 * Return the canonical next scheduled date at or after `from` for an active rule,
 * ignoring overrides/skips. Useful for displaying "Next: Apr 30".
 */
export function nextOccurrenceAtOrAfter(rule: RecurrenceInput, from: Date): Date | null {
  if (rule.endDate && isBefore(rule.endDate, from)) return null;

  let index = estimateIndexAtOrBefore(rule, from);
  for (let i = 0; i < 10_000; i++) {
    const scheduled = occurrenceAtIndex(rule, index);
    if (rule.endDate && isAfter(scheduled, rule.endDate)) return null;
    if (!isBefore(scheduled, from)) return scheduled;
    index += 1;
  }
  return null;
}

/**
 * Produce a preview list of the next `count` occurrences starting from `from` for
 * the given rule, honouring endDate. Purely computed, no exceptions applied.
 */
export function previewOccurrences(rule: RecurrenceInput, count: number, from: Date): Date[] {
  const results: Date[] = [];
  let index = estimateIndexAtOrBefore(rule, from);
  for (let i = 0; i < 10_000 && results.length < count; i++) {
    const scheduled = occurrenceAtIndex(rule, index);
    if (rule.endDate && isAfter(scheduled, rule.endDate)) break;
    if (!isBefore(scheduled, from)) {
      results.push(scheduled);
    }
    index += 1;
  }
  return results;
}

/**
 * True when the rule has an endDate already in the past, meaning the series is
 * over even though its persisted status might still read "ACTIVE".
 */
export function isRuleEnded(rule: { endDate?: Date | null }, now: Date = new Date()): boolean {
  return Boolean(rule.endDate && isBefore(rule.endDate, startOfDay(now)));
}
