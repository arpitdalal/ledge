"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ThemeToggle } from "@/components/settings/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { resetDemoWorkspaceAction, updateSettingsAction } from "@/lib/domain/settings/actions";
import { CURRENCY_CODES } from "@/lib/domain/constants";
import { settingsFormSchema, type SettingsFormValues } from "@/lib/validation/settings";

type Errors = Record<string, string[] | undefined>;

export function SettingsForm({ initialValues }: { initialValues: SettingsFormValues }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isResetting, startReset] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [values, setValues] = useState<SettingsFormValues>(initialValues);
  const isValid = settingsFormSchema.safeParse(values).success;

  function update<K extends keyof SettingsFormValues>(key: K, value: SettingsFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = settingsFormSchema.safeParse(values);

    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    startTransition(async () => {
      const result = await updateSettingsAction(values);
      if (!result.ok) {
        setErrors(result.errors as Errors);
        return;
      }
      setErrors({});
      setMessage("Settings saved.");
      router.refresh();
    });
  }

  function resetDemo() {
    startReset(async () => {
      await resetDemoWorkspaceAction();
      setMessage("Demo data reset.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      <form className="grid gap-5" onSubmit={submit} noValidate>
        <Field label="Workspace name" error={errors.name?.[0]}>
          <Input aria-label="Workspace name" value={values.name} onChange={(event) => update("name", event.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preferred currency" error={errors.currency?.[0]}>
            <Select aria-label="Preferred currency" value={values.currency} onChange={(event) => update("currency", event.target.value as SettingsFormValues["currency"])}>
              {CURRENCY_CODES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Locale / date format" error={errors.locale?.[0]}>
            <Input aria-label="Locale / date format" value={values.locale} onChange={(event) => update("locale", event.target.value)} placeholder="en-CA" />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={!isValid || isPending}>
            {isPending ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </form>

      <div className="grid gap-3">
        <Label>Theme</Label>
        <ThemeToggle />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
        <h2 className="font-semibold text-amber-950 dark:text-amber-100">Demo data</h2>
        <p className="mt-1 text-sm text-amber-900 dark:text-amber-200">
          Reset the local SQLite workspace to the seeded workshop state.
        </p>
        <div className="mt-4">
          <Button type="button" variant="outline" onClick={resetDemo} disabled={isResetting}>
            {isResetting ? "Resetting..." : "Reset and reseed"}
          </Button>
        </div>
      </div>

      {message && <p className="rounded-md border bg-[hsl(var(--secondary))] p-3 text-sm">{message}</p>}
    </div>
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
