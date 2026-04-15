"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTransactionAction, updateTransactionAction } from "@/lib/domain/transactions/actions";
import { toDateInputValue } from "@/lib/domain/format/date";
import { transactionFormSchema, paymentMethodOptions, type TransactionFormValues } from "@/lib/validation/transaction";

type CategoryOption = {
  id: string;
  name: string;
  type: string;
};

type Errors = Record<string, string[] | undefined>;

export function TransactionForm({
  categories,
  initialValues,
  transactionId
}: {
  categories: CategoryOption[];
  initialValues?: Omit<Partial<TransactionFormValues>, "amount" | "date"> & { amount?: string; date?: string | Date };
  transactionId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Errors>({});
  const [values, setValues] = useState<TransactionFormValues>({
    amount: initialValues?.amount ?? "",
    type: initialValues?.type ?? "EXPENSE",
    date: initialValues?.date ? toDateInputValue(initialValues.date) : toDateInputValue(new Date()),
    categoryId: initialValues?.categoryId ?? "",
    payee: initialValues?.payee ?? "",
    note: initialValues?.note ?? "",
    paymentMethod: initialValues?.paymentMethod ?? ""
  });

  const categoryOptions = useMemo(
    () => categories.filter((category) => category.type === values.type),
    [categories, values.type]
  );

  const validationResult = transactionFormSchema.safeParse(values);
  const isValid = validationResult.success;
  const disabledReason = isValid ? null : firstValidationMessage(validationResult.error.flatten().fieldErrors);

  function update<K extends keyof TransactionFormValues>(key: K, value: TransactionFormValues[K]) {
    setValues((current) => ({
      ...current,
      [key]: value,
      ...(key === "type" ? { categoryId: "" } : null)
    }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = transactionFormSchema.safeParse(values);

    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setErrors({});
    startTransition(async () => {
      const result = transactionId
        ? await updateTransactionAction(transactionId, values)
        : await createTransactionAction(values);

      if (!result.ok) {
        setErrors(result.errors as Errors);
        return;
      }

      router.push("/transactions");
      router.refresh();
    });
  }

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      {errors.form?.[0] && <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{errors.form[0]}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Type" error={errors.type?.[0]}>
          <Select aria-label="Type" value={values.type} onChange={(event) => update("type", event.target.value as TransactionFormValues["type"])}>
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </Select>
        </Field>

        <Field label="Amount" error={errors.amount?.[0]}>
          <Input aria-label="Amount" inputMode="decimal" placeholder="125.00" value={values.amount} onChange={(event) => update("amount", event.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Date" error={errors.date?.[0]}>
          <Input aria-label="Date" type="date" value={values.date} onChange={(event) => update("date", event.target.value)} />
        </Field>

        <Field label="Category" error={errors.categoryId?.[0]}>
          <Select aria-label="Category" value={values.categoryId} onChange={(event) => update("categoryId", event.target.value)}>
            <option value="">Choose category</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Payee / merchant" error={errors.payee?.[0]}>
        <Input aria-label="Payee / merchant" value={values.payee} onChange={(event) => update("payee", event.target.value)} placeholder="Farm Boy" />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Payment method" helper="Optional" error={errors.paymentMethod?.[0]}>
          <Select aria-label="Payment method" value={values.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)}>
            <option value="">Not specified</option>
            {paymentMethodOptions.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Note" helper="Optional" error={errors.note?.[0]}>
          <Textarea aria-label="Note" value={values.note} onChange={(event) => update("note", event.target.value)} placeholder="Short context" />
        </Field>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => router.push("/transactions")}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid || isPending}>
          {isPending ? "Saving..." : transactionId ? "Save transaction" : "Add transaction"}
        </Button>
      </div>
      {disabledReason && !isPending && (
        <p className="text-right text-sm text-[hsl(var(--muted-foreground))]" aria-live="polite">
          {disabledReason}
        </p>
      )}
    </form>
  );
}

function firstValidationMessage(errors: Errors) {
  return (
    errors.amount?.[0] ??
    errors.type?.[0] ??
    errors.date?.[0] ??
    errors.categoryId?.[0] ??
    errors.payee?.[0] ??
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
