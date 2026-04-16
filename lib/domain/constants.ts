export const TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const CURRENCY_CODES = ["CAD", "USD", "EUR", "GBP"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export const CATEGORY_COLORS = [
  "slate",
  "zinc",
  "emerald",
  "teal",
  "sky",
  "indigo",
  "violet",
  "rose",
  "amber"
] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export const CATEGORY_ICONS = [
  "home",
  "cart",
  "bolt",
  "car",
  "utensils",
  "bag",
  "shield",
  "ticket",
  "repeat",
  "briefcase",
  "laptop",
  "rotate-ccw"
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export const PAYMENT_METHODS = ["Debit", "Credit card", "Cash", "Bank transfer", "Pre-authorized"] as const;

export const RECURRENCE_FREQUENCIES = ["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export const RECURRING_RULE_STATUSES = ["ACTIVE", "PAUSED", "ENDED"] as const;
export type RecurringRuleStatus = (typeof RECURRING_RULE_STATUSES)[number];

export const RECURRING_OCCURRENCE_KINDS = ["SKIPPED", "EDITED"] as const;
export type RecurringOccurrenceKind = (typeof RECURRING_OCCURRENCE_KINDS)[number];

export const UPCOMING_HORIZON_DAYS = 30;
export const RECURRING_PREVIEW_COUNT = 5;
