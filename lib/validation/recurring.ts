import { z } from "zod";

import {
  PAYMENT_METHODS,
  RECURRENCE_FREQUENCIES,
  RECURRING_RULE_STATUSES,
  TRANSACTION_TYPES
} from "@/lib/domain/constants";
import { parseCurrencyToCents } from "@/lib/domain/format/currency";

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T12:00:00`)), "Enter a valid date.");

export const recurringRuleFormSchema = z
  .object({
    payee: z
      .string()
      .trim()
      .min(1, "Enter a payee or rule name.")
      .max(80, "Keep payee under 80 characters."),
    type: z.enum(TRANSACTION_TYPES, { error: "Choose income or expense." }),
    amount: z
      .string()
      .trim()
      .min(1, "Enter an amount.")
      .transform((value) => parseCurrencyToCents(value))
      .refine((value) => Number.isFinite(value), "Enter a valid amount.")
      .refine((value) => value > 0, "Amount must be greater than 0."),
    categoryId: z.string().min(1, "Choose a category."),
    frequency: z.enum(RECURRENCE_FREQUENCIES, { error: "Choose a frequency." }),
    startDate: dateString,
    endDate: z.string().trim().optional().or(z.literal("")),
    note: z.string().trim().max(240, "Keep note under 240 characters.").optional().or(z.literal("")),
    paymentMethod: z
      .string()
      .trim()
      .max(40, "Keep payment method under 40 characters.")
      .optional()
      .or(z.literal("")),
    status: z.enum(RECURRING_RULE_STATUSES).optional()
  })
  .superRefine((data, ctx) => {
    if (data.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.endDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Enter a valid end date."
      });
      return;
    }
    if (data.endDate && data.startDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date cannot be before start date."
      });
    }
  });

export const recurringRuleWriteSchema = recurringRuleFormSchema.transform((value) => ({
  payee: value.payee,
  type: value.type,
  amount: value.amount,
  categoryId: value.categoryId,
  frequency: value.frequency,
  startDate: value.startDate,
  endDate: value.endDate ? value.endDate : null,
  note: value.note ? value.note : null,
  paymentMethod: value.paymentMethod ? value.paymentMethod : null,
  status: value.status ?? "ACTIVE"
}));

export const occurrenceEditSchema = z.object({
  scheduledDate: dateString,
  amount: z
    .string()
    .trim()
    .min(1, "Enter an amount.")
    .transform((value) => parseCurrencyToCents(value))
    .refine((value) => Number.isFinite(value) && value > 0, "Amount must be greater than 0."),
  payee: z.string().trim().min(1, "Enter a payee.").max(80, "Keep payee under 80 characters."),
  date: dateString,
  note: z.string().trim().max(240, "Keep note under 240 characters.").optional().or(z.literal("")),
  paymentMethod: z
    .string()
    .trim()
    .max(40, "Keep payment method under 40 characters.")
    .optional()
    .or(z.literal(""))
});

export type RecurringRuleFormValues = z.input<typeof recurringRuleFormSchema>;
export type RecurringRuleWriteValues = z.output<typeof recurringRuleWriteSchema>;
export type OccurrenceEditValues = z.input<typeof occurrenceEditSchema>;

export const paymentMethodOptions = PAYMENT_METHODS;
