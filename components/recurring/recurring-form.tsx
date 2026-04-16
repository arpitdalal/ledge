"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { CalendarCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  RECURRENCE_FREQUENCIES,
  RECURRING_PREVIEW_COUNT,
  type RecurrenceFrequency
} from "@/lib/domain/constants";
import { parseCurrencyToCents } from "@/lib/domain/format/currency";
import { toDateInputValue } from "@/lib/domain/format/date";
import {
  createRecurringRuleAction,
  updateRecurringRuleAction
} from "@/lib/domain/recurring/actions";
import { previewRuleOccurrences } from "@/lib/domain/recurring/recurrence";
import {
  paymentMethodOptions,
  recurringRuleFormSchema,
  type RecurringRuleFormValues
} from "@/lib/validation/recurring";

type CategoryOption = {
  id: string;
  name: string;
  type: string;
};

type Errors = Record<string, string[] | undefined>;

const frequencyLabels: Record<RecurrenceFrequency, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Every 2 weeks",
  MONTHLY: "Monthly",
  YEARLY: "Yearly"
};

const frequencyHelper: Record<RecurrenceFrequency, string> = {
  WEEKLY: "Repeats every 7 days from the start date.",
  BIWEEKLY: "Repeats every 14 days from the start date.",
  MONTHLY: "Repeats on the same day each month. Short months clamp to the last day.",
  YEARLY: "Repeats on the same month and day each year. Feb 29 falls back to Feb 28 in non-leap years."
};

type InitialValues = Omit<Partial<RecurringRuleFormValues>, "startDate" | "endDate"> & {
  startDate?: string | Date;
  endDate?: string | Date;
};

export function RecurringForm({
  categories,
  currency,
  locale,
  initialValues,
  ruleId
}: {
  categories: CategoryOption[];
  currency: string;
  locale: string;
  initialValues?: InitialValues;
  ruleId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Errors>({});
  const [values, setValues] = useState<RecurringRuleFormValues>({
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
    paymentMethod: initialValues?.paymentMethod ?? "",
    status: initialValues?.status ?? "ACTIVE"
  });

  const categoryOptions = useMemo(
    () => categories.filter((category) => category.type === values.type),
    [categories, values.type]
  );

  const validationResult = recurringRuleFormSchema.safeParse(values);
  const isValid = validationResult.success;

  const preview = useMemo(() => {
    if (!values.startDate) return [];
    const startDate = new Date(`${values.startDate}T12:00:00`);
    if (Number.isNaN(startDate.getTime())) return [];
    if (values.endDate) {
      const end = new Date(`${values.endDate}T12:00:00`);
      if (!Number.isNaN(end.getTime()) && end < startDate) return [];
    }
    const amount = parseCurrencyToCents(values.amount || "0");

    return previewRuleOccurrences(
      {
        id: "preview",
        type: values.type,
        amount: Number.isFinite(amount) ? amount : 0,
        payee: values.payee || "",
        note: values.note || null,
        paymentMethod: values.paymentMethod || null,
        categoryId: values.categoryId || "",
        frequency: values.frequency,
        startDate,
        endDate: values.endDate ? new Date(`${values.endDate}T12:00:00`) : null,
        status: "ACTIVE"
      },
      RECURRING_PREVIEW_COUNT,
      new Date()
    );
  }, [
    values.amount,
    values.categoryId,
    values.endDate,
    values.frequency,
    values.note,
    values.paymentMethod,
    values.payee,
    values.startDate,
    values.type
  ]);

  function update<K extends keyof RecurringRuleFormValues>(key: K, value: RecurringRuleFormValues[K]) {
    setValues((current) => ({
      ...current,
      [key]: value,
      ...(key === "type" ? { categoryId: "" } : null)
    }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = recurringRuleFormSchema.safeParse(values);

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
    <form className="grid gap-6" onSubmit={submit} noValidate>
      {errors.form?.[0] && (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {errors.form[0]}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Type" error={errors.type?.[0]}>
          <Select
            aria-label="Type"
            value={values.type}
            onChange={(event) => update("type", event.target.value as RecurringRuleFormValues["type"])}
          >
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </Select>
        </Field>

        <Field label="Amount" error={errors.amount?.[0]}>
          <Input
            aria-label="Amount"
            inputMode="decimal"
            placeholder="1,850.00"
            value={values.amount}
            onChange={(event) => update("amount", event.target.value)}
          />
        </Field>
      </div>

      <Field label="Payee / rule name" error={errors.payee?.[0]}>
        <Input
          aria-label="Payee / rule name"
          placeholder="Harrington Lofts"
          value={values.payee}
          onChange={(event) => update("payee", event.target.value)}
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

        <Field
          label="Frequency"
          helper={frequencyHelper[values.frequency as RecurrenceFrequency]}
          error={errors.frequency?.[0]}
        >
          <Select
            aria-label="Frequency"
            value={values.frequency}
            onChange={(event) => update("frequency", event.target.value as RecurringRuleFormValues["frequency"])}
          >
            {RECURRENCE_FREQUENCIES.map((frequency) => (
              <option key={frequency} value={frequency}>
                {frequencyLabels[frequency]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Start date" error={errors.startDate?.[0]}>
          <Input
            aria-label="Start date"
            type="date"
            value={values.startDate}
            onChange={(event) => update("startDate", event.target.value)}
          />
        </Field>

        <Field
          label="End date"
          helper="Optional — leave blank for open-ended"
          error={errors.endDate?.[0]}
        >
          <Input
            aria-label="End date"
            type="date"
            value={values.endDate}
            onChange={(event) => update("endDate", event.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Payment method" helper="Optional" error={errors.paymentMethod?.[0]}>
          <Select
            aria-label="Payment method"
            value={values.paymentMethod}
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
            placeholder="Short context"
            value={values.note}
            onChange={(event) => update("note", event.target.value)}
          />
        </Field>
      </div>

      <OccurrencePreview
        dates={preview}
        amountInput={values.amount}
        type={values.type}
        currency={currency}
        locale={locale}
      />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => router.push("/recurring")}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid || isPending}>
          {isPending ? "Saving..." : ruleId ? "Save rule" : "Create rule"}
        </Button>
      </div>
    </form>
  );
}

function OccurrencePreview({
  dates,
  amountInput,
  type,
  currency,
  locale
}: {
  dates: Date[];
  amountInput: string;
  type: string;
  currency: string;
  locale: string;
}) {
  const amount = parseCurrencyToCents(amountInput || "0");
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;

  return (
    <div className="rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarCheck className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        Upcoming preview
      </div>
      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
        Next {RECURRING_PREVIEW_COUNT} occurrences based on current inputs.
      </p>
      {dates.length === 0 ? (
        <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
          Fill in a start date and frequency to preview generated occurrences.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {dates.map((date) => (
            <li
              key={date.toISOString()}
              className="flex items-center justify-between gap-3 rounded-md border bg-[hsl(var(--background))] px-3 py-2 text-sm"
            >
              <span>
                {date.toLocaleDateString(locale, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
              </span>
              <span
                className={
                  type === "INCOME"
                    ? "font-semibold text-emerald-600"
                    : "font-semibold text-rose-600"
                }
              >
                {type === "INCOME" ? "+" : "-"}
                {new Intl.NumberFormat(locale, {
                  style: "currency",
                  currency,
                  maximumFractionDigits: 2
                }).format(safeAmount / 100)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
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
