import Link from "next/link";
import { ArrowDownCircle, ArrowRight, ArrowUpCircle, CalendarRange, Landmark } from "lucide-react";

import { UpcomingList } from "@/components/recurring/upcoming-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/domain/format/currency";
import type { UpcomingCashFlow } from "@/lib/domain/recurring/service";

export function UpcomingCashFlowSection({
  data,
  currency,
  locale
}: {
  data: UpcomingCashFlow;
  currency: string;
  locale: string;
}) {
  const { summary, occurrences, horizonDays } = data;
  const hasData = occurrences.length > 0;

  return (
    <Card aria-label="Upcoming cash flow" data-testid="upcoming-cash-flow">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
            Upcoming cash flow
          </CardTitle>
          <CardDescription>Projected from recurring rules for the next {horizonDays} days.</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/recurring">
            Manage recurring
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniStat
            label="Upcoming income"
            value={formatCurrency(summary.income, currency, locale)}
            icon={<ArrowUpCircle className="h-4 w-4" />}
            tone="income"
          />
          <MiniStat
            label="Upcoming expenses"
            value={formatCurrency(summary.expenses, currency, locale)}
            icon={<ArrowDownCircle className="h-4 w-4" />}
            tone="expense"
          />
          <MiniStat
            label="Upcoming net"
            value={formatCurrency(summary.net, currency, locale)}
            icon={<Landmark className="h-4 w-4" />}
            tone={summary.net >= 0 ? "income" : "expense"}
          />
        </div>

        {hasData ? (
          <UpcomingList
            occurrences={occurrences.slice(0, 8)}
            currency={currency}
            locale={locale}
            showSkipAction
          />
        ) : data.hasActiveRules ? (
          <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No upcoming occurrences inside the next {horizonDays} days.
          </div>
        ) : (
          <div className="rounded-lg border border-dashed px-4 py-8 text-center">
            <p className="text-sm font-medium">No recurring rules yet</p>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Add a rule to project upcoming cash flow without creating each transaction manually.
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link href="/recurring/new">Create first rule</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  icon,
  tone
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "income" | "expense";
}) {
  const toneClass =
    tone === "income"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300";

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-[hsl(var(--muted-foreground))]">
        <span className={`grid h-7 w-7 place-items-center rounded-md ${toneClass}`}>{icon}</span>
        {label}
      </div>
      <div className="mt-3 text-xl font-semibold">{value}</div>
    </div>
  );
}
