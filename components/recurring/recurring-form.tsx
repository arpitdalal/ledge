"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RECURRING_FREQUENCIES, type RecurringFrequency } from "@/lib/domain/constants";
import { formatCurrency, parseCurrencyToCents } from "@/lib/domain/format/currency";
import { formatDate, toDateInputValue } from "@/lib/domain/format/date";
import { previewOccurrences } from "@/lib/domain/recurring/recurrence";
import {
  createRecurringRuleAction,
  updateRecurringRuleAction
} from "@/lib/domain/recurring/actions";
import { paymentMethodOptions } from "@/lib/validation/transaction";
import {
  recurringFormSchema,
  type RecurringFormValues
} from "@/lib/validation/recurring";

type CategoryOption = {
  id: string;
  name: string;
  type: string;
};

type Errors = Record<string, string[] | undefined>;

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Every 2 weeks",
  MONTHLY: "Monthly",
  YEARLY: "Yearly"
};

const PREVIEW_COUNT = 5;

export function RecurringForm({
  categories,
  initialValues,
  ruleId,
  currency,
  locale
}: {
  categories: CategoryOption[];
  initialValues?: Partial<RecurringFormValues> & { startDate?: string | Date; endDate?: string | Date | null };
  ruleId?: string;
  currency: string;
  locale: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Errors>({});
  const [values, setValues] = useState<RecurringFormValues>(() => ({
    payee: initialValues?.payee ?? "",
    type: initialValues?.type ?? "EXPENSE",
    amount: initialValues?.amount ?? "",
    categoryId: initialValues?.categoryId ?? "",
    frequency: initialValues?.frequency ?? "MONTHLY",
    startDate: initialValues?.startDate
      ? toDateInputValue(initialValues.startDate)
      : toDateInputValue(new Date()),
    endDate: initialValues?.endDate ? toDateInputValue(initialValues.endDate) : "",
    note: initialValues?.note ?? "",
    paymentMethod: initialValues?.paymentMethod ?? ""
  }));

  const categoryOptions = useMemo(
    () => categories.filter((category) => category.type === values.type),
    [categories, values.type]
  );

  const validationResult = recurringFormSchema.safeParse(values);
  const isValid = validationResult.success;
  const disabledReason = isValid ? null : firstValidationMessage(validationResult.error.flatten().fieldErrors);

  const preview = useMemo(() => {
    const startDateValue = values.startDate ? new Date(`${values.startDate}T12:00:00`) : null;
    if (!startDateValue || Number.isNaN(startDateValue.getTime())) return [];
    const endDateValue = values.endDate ? new Date(`${values.endDate}T12:00:00`) : null;
    if (endDateValue && Number.isNaN(endDateValue.getTime())) return [];
    const parsedCents = parseCurrencyToCents(values.amount);
    const amount = Number.isFinite(parsedCents) && parsedCents > 0 ? parsedCents : null;

    return previewOccurrences(
      {
        frequency: values.frequency as RecurringFrequency,
        startDate: startDateValue,
        endDate: endDateValue
      },
      PREVIEW_COUNT,
      startDateValue
    ).map((date) => ({ date, amount }));
  }, [values.amount, values.endDate, values.frequency, values.startDate]);

  function update<K extends keyof RecurringFormValues>(key: K, value: RecurringFormValues[K]) {
    setValues((current) => ({
      ...current,
      [key]: value,
      ...(key === "type" ? { categoryId: "" } : null)
    }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = recurringFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }
    setErrors({});

    startTransition(async () => {
      const result = ruleId
        ? await updateRecurringRuleAction(ruleId, values)
        : await createRecurringRuleAction(values);

      if (!result.ok) {
        setErrors(result.errors as Errors);
        return;
      }

      router.push("/recurring");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <form className="grid gap-5" onSubmit={submit} noValidate>
        {errors.form?.[0] && (
          <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
            {errors.form[0]}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Type" error={errors.type?.[0]}>
            <Select
              aria-label="Type"
              value={values.type}
              onChange={(event) => update("type", event.target.value as RecurringFormValues["type"])}
            >
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </Select>
          </Field>

          <Field label="Amount" error={errors.amount?.[0]}>
            <Input
              aria-label="Amount"
              inputMode="decimal"
              placeholder="125.00"
              value={values.amount}
              onChange={(event) => update("amount", event.target.value)}
            />
          </Field>
        </div>

        <Field label="Name / payee" error={errors.payee?.[0]} helper="Shows on the upcoming list and any posted copy.">
          <Input
            aria-label="Name / payee"
            value={values.payee}
            onChange={(event) => update("payee", event.target.value)}
            placeholder="Rent · Harrington Lofts"
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Category" error={errors.categoryId?.[0]}>
            <Select
              aria-label="Category"
              value={values.categoryId}
              onChange={(event) => update("categoryId", event.target.value)}
            >
              <option value="">Choose category</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Frequency" error={errors.frequency?.[0]}>
            <Select
              aria-label="Frequency"
              value={values.frequency}
              onChange={(event) => update("frequency", event.target.value as RecurringFrequency)}
            >
              {RECURRING_FREQUENCIES.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {FREQUENCY_LABELS[frequency]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Start date"
            error={errors.startDate?.[0]}
            helper="First occurrence. Later dates are anchored to this day."
          >
            <Input
              aria-label="Start date"
              type="date"
              value={values.startDate}
              onChange={(event) => update("startDate", event.target.value)}
            />
          </Field>

          <Field
            label="End date"
            helper="Optional — leave blank for indefinite"
            error={errors.endDate?.[0]}
          >
            <Input
              aria-label="End date"
              type="date"
              value={values.endDate ?? ""}
              onChange={(event) => update("endDate", event.target.value)}
              min={values.startDate}
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Payment method" helper="Optional" error={errors.paymentMethod?.[0]}>
            <Select
              aria-label="Payment method"
              value={values.paymentMethod ?? ""}
              onChange={(event) => update("paymentMethod", event.target.value)}
            >
              <option value="">Not specified</option>
              {paymentMethodOptions.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Note" helper="Optional" error={errors.note?.[0]}>
            <Textarea
              aria-label="Note"
              value={values.note ?? ""}
              onChange={(event) => update("note", event.target.value)}
              placeholder="Context for future-you"
            />
          </Field>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => router.push("/recurring")}>
            Cancel
          </Button>
          <Button type="submit" disabled={!isValid || isPending}>
            {isPending ? "Saving..." : ruleId ? "Save rule" : "Create recurring rule"}
          </Button>
        </div>
        {disabledReason && !isPending && (
          <p className="text-right text-sm text-[hsl(var(--muted-foreground))]" aria-live="polite">
            {disabledReason}
          </p>
        )}
      </form>

      <aside
        className="h-fit rounded-lg border bg-[hsl(var(--muted)/0.4)] p-5"
        aria-label="Preview of upcoming occurrences"
      >
        <div>
          <h3 className="text-sm font-semibold">Preview</h3>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Next {PREVIEW_COUNT} occurrences generated from your settings. Nothing is saved yet.
          </p>
        </div>
        <ul className="mt-4 grid gap-2 text-sm">
          {preview.length === 0 ? (
            <li className="rounded-md border border-dashed p-3 text-[hsl(var(--muted-foreground))]">
              Fill in the start date and frequency to preview.
            </li>
          ) : (
            preview.map(({ date, amount }) => (
              <li
                key={date.toISOString()}
                className="flex items-center justify-between gap-3 rounded-md border bg-[hsl(var(--background))] px-3 py-2"
              >
                <span className="font-medium">{formatDate(date, "EEE, MMM d, yyyy")}</span>
                <span
                  className={
                    values.type === "INCOME"
                      ? "font-semibold text-emerald-600"
                      : "font-semibold text-rose-600"
                  }
                >
                  {amount === null
                    ? "—"
                    : `${values.type === "INCOME" ? "+" : "-"}${formatCurrency(amount, currency, locale)}`}
                </span>
              </li>
            ))
          )}
        </ul>
      </aside>
    </div>
  );
}

function firstValidationMessage(errors: Errors) {
  return (
    errors.payee?.[0] ??
    errors.type?.[0] ??
    errors.amount?.[0] ??
    errors.categoryId?.[0] ??
    errors.frequency?.[0] ??
    errors.startDate?.[0] ??
    errors.endDate?.[0] ??
    errors.paymentMethod?.[0] ??
    errors.note?.[0] ??
    null
  );
}

function Field({
  label,
  helper,
  error,
  children
}: {
  label: string;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        {helper && <span className="text-xs text-[hsl(var(--muted-foreground))]">{helper}</span>}
      </div>
      {children}
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
