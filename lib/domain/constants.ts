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
