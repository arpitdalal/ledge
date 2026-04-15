import { z } from "zod";

import { PAYMENT_METHODS, TRANSACTION_TYPES } from "@/lib/domain/constants";
import { parseCurrencyToCents } from "@/lib/domain/format/currency";

export const transactionFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Enter an amount.")
    .transform((value) => parseCurrencyToCents(value))
    .refine((value) => Number.isFinite(value), "Enter a valid amount.")
    .refine((value) => value > 0, "Amount must be greater than 0."),
  type: z.enum(TRANSACTION_TYPES, { error: "Choose income or expense." }),
  date: z.string().min(1, "Choose a date."),
  categoryId: z.string().min(1, "Choose a category."),
  payee: z.string().trim().min(1, "Enter a payee or merchant.").max(80, "Keep payee under 80 characters."),
  note: z.string().trim().max(240, "Keep note under 240 characters.").optional().or(z.literal("")),
  paymentMethod: z.string().trim().max(40, "Keep payment method under 40 characters.").optional().or(z.literal(""))
});

export const transactionWriteSchema = transactionFormSchema.transform((value) => ({
  ...value,
  note: value.note || null,
  paymentMethod: value.paymentMethod || null
}));

export type TransactionFormValues = z.input<typeof transactionFormSchema>;
export type TransactionWriteValues = z.output<typeof transactionWriteSchema>;

export const paymentMethodOptions = PAYMENT_METHODS;
