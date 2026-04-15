"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createCategoryAction, updateCategoryAction } from "@/lib/domain/categories/actions";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/domain/constants";
import { categoryFormSchema, type CategoryFormValues } from "@/lib/validation/category";

type Errors = Record<string, string[] | undefined>;

export function CategoryForm({
  categoryId,
  initialValues,
  onDone
}: {
  categoryId?: string;
  initialValues?: CategoryFormValues;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Errors>({});
  const [values, setValues] = useState<CategoryFormValues>(
    initialValues ?? {
      name: "",
      type: "EXPENSE",
      color: "slate",
      icon: "cart"
    }
  );
  const isValid = categoryFormSchema.safeParse(values).success;

  function update<K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = categoryFormSchema.safeParse(values);

    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setErrors({});
    startTransition(async () => {
      const result = categoryId ? await updateCategoryAction(categoryId, values) : await createCategoryAction(values);

      if (!result.ok) {
        setErrors(result.errors as Errors);
        return;
      }

      if (!categoryId) {
        setValues({ name: "", type: "EXPENSE", color: "slate", icon: "cart" });
      }
      onDone?.();
      router.refresh();
    });
  }

  return (
    <form className="grid gap-4" onSubmit={submit} noValidate>
      {errors.form?.[0] && <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{errors.form[0]}</p>}
      <Field label="Name" error={errors.name?.[0]}>
        <Input aria-label="Name" value={values.name} onChange={(event) => update("name", event.target.value)} placeholder="Coffee" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Type" error={errors.type?.[0]}>
          <Select aria-label="Type" value={values.type} onChange={(event) => update("type", event.target.value as CategoryFormValues["type"])}>
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </Select>
        </Field>
        <Field label="Color" error={errors.color?.[0]}>
          <Select aria-label="Color" value={values.color} onChange={(event) => update("color", event.target.value as CategoryFormValues["color"])}>
            {CATEGORY_COLORS.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Icon" error={errors.icon?.[0]}>
          <Select aria-label="Icon" value={values.icon} onChange={(event) => update("icon", event.target.value as CategoryFormValues["icon"])}>
            {CATEGORY_ICONS.map((icon) => (
              <option key={icon} value={icon}>
                {icon}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={!isValid || isPending}>
          {isPending ? "Saving..." : categoryId ? "Save category" : "Create category"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
