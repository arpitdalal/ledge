import Link from "next/link";
import { Plus } from "lucide-react";

import { RecurringList } from "@/components/recurring/recurring-list";
import { UpcomingList } from "@/components/recurring/upcoming-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getEffectiveStatus,
  getNextEffectiveOccurrence,
  getUpcomingCashFlow,
  listRecurringRules
} from "@/lib/domain/recurring/service";
import { getWorkspace } from "@/lib/domain/workspace/service";
import type { RecurringFrequency } from "@/lib/domain/constants";

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const [workspace, rules, upcoming] = await Promise.all([
    getWorkspace(),
    listRecurringRules(),
    getUpcomingCashFlow()
  ]);

  const rows = rules.map((rule) => ({
    id: rule.id,
    payee: rule.payee,
    type: rule.type as "INCOME" | "EXPENSE",
    amount: rule.amount,
    frequency: rule.frequency as RecurringFrequency,
    category: { name: rule.category.name },
    effectiveStatus: getEffectiveStatus(rule),
    nextOccurrence: getNextEffectiveOccurrence(rule),
    startDate: rule.startDate,
    endDate: rule.endDate,
    paymentMethod: rule.paymentMethod
  }));

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Recurring</h1>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            Rules that generate upcoming cash flow. Posted history stays in Transactions.
          </p>
        </div>
        <Button asChild>
          <Link href="/recurring/new">
            <Plus className="h-4 w-4" />
            New recurring rule
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No recurring rules yet"
          description="Create rules for rent, salary, subscriptions — anything that repeats — to project upcoming cash flow."
          action={
            <Button asChild>
              <Link href="/recurring/new">Create recurring rule</Link>
            </Button>
          }
        />
      ) : (
        <>
          <section aria-labelledby="rules-heading" className="grid gap-3">
            <div className="flex items-baseline justify-between">
              <h2 id="rules-heading" className="text-lg font-semibold tracking-normal">
                Rules
              </h2>
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                {rows.length} rule{rows.length === 1 ? "" : "s"}
              </span>
            </div>
            <RecurringList rules={rows} currency={workspace.currency} locale={workspace.locale} />
          </section>

          <section aria-labelledby="upcoming-heading" className="grid gap-3">
            <Card>
              <CardHeader>
                <CardTitle id="upcoming-heading">Upcoming {upcoming.horizonDays}-day view</CardTitle>
                <CardDescription>
                  Generated from active rules. Skip an occurrence to exclude it without touching the rule.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UpcomingList
                  items={upcoming.items}
                  currency={workspace.currency}
                  locale={workspace.locale}
                />
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
