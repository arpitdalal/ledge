"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pause, Pencil, Play, Repeat, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  deleteRecurringRuleAction,
  setRecurringRuleStatusAction
} from "@/lib/domain/recurring/actions";
import type { RecurringFrequency } from "@/lib/domain/constants";
import { formatCurrency } from "@/lib/domain/format/currency";
import { formatDate } from "@/lib/domain/format/date";

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Every 2 weeks",
  MONTHLY: "Monthly",
  YEARLY: "Yearly"
};

type RuleRow = {
  id: string;
  payee: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  frequency: RecurringFrequency;
  category: { name: string };
  effectiveStatus: "ACTIVE" | "PAUSED" | "ENDED";
  nextOccurrence: Date | null;
  startDate: Date;
  endDate: Date | null;
  paymentMethod: string | null;
};

const STATUS_VARIANT: Record<RuleRow["effectiveStatus"], "default" | "outline" | "secondary"> = {
  ACTIVE: "default",
  PAUSED: "outline",
  ENDED: "secondary"
};

const STATUS_LABEL: Record<RuleRow["effectiveStatus"], string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  ENDED: "Ended"
};

export function RecurringList({
  rules,
  currency,
  locale
}: {
  rules: RuleRow[];
  currency: string;
  locale: string;
}) {
  if (rules.length === 0) {
    return (
      <EmptyState
        title="No recurring rules yet"
        description="Create rules for rent, salary, subscriptions — anything that repeats — to see upcoming cash flow on the dashboard."
        action={
          <Button asChild>
            <Link href="/recurring/new">Create recurring rule</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-3">
      {rules.map((rule) => (
        <RecurringRow key={rule.id} rule={rule} currency={currency} locale={locale} />
      ))}
    </div>
  );
}

function RecurringRow({
  rule,
  currency,
  locale
}: {
  rule: RuleRow;
  currency: string;
  locale: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const togglePause = () => {
    setMessage(null);
    startTransition(async () => {
      const next = rule.effectiveStatus === "PAUSED" ? "ACTIVE" : "PAUSED";
      const result = await setRecurringRuleStatusAction(rule.id, next);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      router.refresh();
    });
  };

  const remove = () => {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Delete recurring rule "${rule.payee}"? This removes the rule and any future upcoming occurrences. Posted history is not affected.`
      );
      if (!ok) return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await deleteRecurringRuleAction(rule.id);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <Card>
      <CardContent className="grid gap-4 p-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] md:items-center">
        <div className="flex items-start gap-3">
          <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]">
            <Repeat className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-medium">{rule.payee}</span>
              <Badge variant={rule.type === "INCOME" ? "income" : "expense"}>
                {rule.type === "INCOME" ? "Income" : "Expense"}
              </Badge>
              <Badge variant={STATUS_VARIANT[rule.effectiveStatus]}>{STATUS_LABEL[rule.effectiveStatus]}</Badge>
            </div>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              {rule.category.name} · {FREQUENCY_LABELS[rule.frequency]}
              {rule.paymentMethod ? ` · ${rule.paymentMethod}` : ""}
            </p>
          </div>
        </div>

        <div className="text-sm">
          <div className="text-[hsl(var(--muted-foreground))]">Next occurrence</div>
          <div className="font-medium">
            {rule.nextOccurrence ? formatDate(rule.nextOccurrence) : "—"}
          </div>
          <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Started {formatDate(rule.startDate)}
            {rule.endDate ? ` · ends ${formatDate(rule.endDate)}` : ""}
          </div>
        </div>

        <div className={`text-right text-lg font-semibold md:text-left ${rule.type === "INCOME" ? "text-emerald-600" : "text-rose-600"}`}>
          {rule.type === "INCOME" ? "+" : "-"}
          {formatCurrency(rule.amount, currency, locale)}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild variant="ghost" size="icon" aria-label={`Edit ${rule.payee}`}>
            <Link href={`/recurring/${rule.id}/edit`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePause}
            disabled={isPending || rule.effectiveStatus === "ENDED"}
            aria-label={
              rule.effectiveStatus === "PAUSED" ? `Resume ${rule.payee}` : `Pause ${rule.payee}`
            }
          >
            {rule.effectiveStatus === "PAUSED" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={remove}
            disabled={isPending}
            aria-label={`Delete ${rule.payee}`}
          >
            <Trash2 className="h-4 w-4 text-rose-600" />
          </Button>
        </div>

        {message && (
          <p className="md:col-span-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
