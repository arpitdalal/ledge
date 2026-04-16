import { z } from "zod";

import { RECURRING_FREQUENCIES, TRANSACTION_TYPES } from "@/lib/domain/constants";
import { parseCurrencyToCents } from "@/lib/domain/format/currency";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidIsoCalendarDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
  );
}

const isoDate = z
  .string()
  .min(1)
  .regex(ISO_DATE_PATTERN, "Use a valid date.")
  .refine((value) => isValidIsoCalendarDate(value), "Use a valid date.");

const optionalIsoDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null))
  .refine(
    (value) => value === null || ISO_DATE_PATTERN.test(value),
    "Use a valid end date."
  )
  .refine(
    (value) => value === null || isValidIsoCalendarDate(value),
    "Use a valid end date."
  );

export const recurringFormSchema = z
  .object({
    payee: z
      .string()
      .trim()
      .min(1, "Enter a name or payee.")
      .max(80, "Keep name under 80 characters."),
    type: z.enum(TRANSACTION_TYPES, { error: "Choose income or expense." }),
    amount: z
      .string()
      .trim()
      .min(1, "Enter an amount.")
      .transform((value) => parseCurrencyToCents(value))
      .refine((value) => Number.isFinite(value), "Enter a valid amount.")
      .refine((value) => value > 0, "Amount must be greater than 0."),
    categoryId: z.string().min(1, "Choose a category."),
    frequency: z.enum(RECURRING_FREQUENCIES, { error: "Choose a frequency." }),
    startDate: isoDate.refine((value) => !!value, { error: "Choose a start date." }),
    endDate: optionalIsoDate,
    note: z
      .string()
      .trim()
      .max(240, "Keep note under 240 characters.")
      .optional()
      .or(z.literal("")),
    paymentMethod: z
      .string()
      .trim()
      .max(40, "Keep payment method under 40 characters.")
      .optional()
      .or(z.literal(""))
  })
  .refine(
    (value) => !value.endDate || value.endDate >= value.startDate,
    { error: "End date cannot be before start date.", path: ["endDate"] }
  );

export const recurringWriteSchema = recurringFormSchema.transform((value) => ({
  ...value,
  note: value.note && value.note.length > 0 ? value.note : null,
  paymentMethod: value.paymentMethod && value.paymentMethod.length > 0 ? value.paymentMethod : null,
  endDate: value.endDate ?? null
}));

export type RecurringFormValues = z.input<typeof recurringFormSchema>;
export type RecurringWriteValues = z.output<typeof recurringWriteSchema>;

export const occurrenceEditSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Enter an amount.")
    .transform((value) => parseCurrencyToCents(value))
    .refine((value) => Number.isFinite(value), "Enter a valid amount.")
    .refine((value) => value > 0, "Amount must be greater than 0."),
  date: isoDate,
  payee: z.string().trim().min(1, "Enter a name or payee.").max(80, "Keep name under 80 characters."),
  note: z
    .string()
    .trim()
    .max(240, "Keep note under 240 characters.")
    .optional()
    .or(z.literal("")),
  paymentMethod: z
    .string()
    .trim()
    .max(40, "Keep payment method under 40 characters.")
    .optional()
    .or(z.literal("")),
  categoryId: z.string().min(1, "Choose a category.")
});

export type OccurrenceEditValues = z.input<typeof occurrenceEditSchema>;
