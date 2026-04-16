import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, CalendarClock } from "lucide-react";

import { UpcomingList } from "@/components/recurring/upcoming-list";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/domain/format/currency";
import type { UpcomingCashFlow } from "@/lib/domain/recurring/service";

export function UpcomingCashFlowSection({
  upcoming,
  currency,
  locale
}: {
  upcoming: UpcomingCashFlow;
  currency: string;
  locale: string;
}) {
  return (
    <section aria-label="Upcoming cash flow" className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-normal">Upcoming cash flow</h2>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            From recurring rules, next {upcoming.horizonDays} days. Not posted to history.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/recurring">Manage recurring</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          title="Upcoming income"
          value={formatCurrency(upcoming.income, currency, locale)}
          helper={`Next ${upcoming.horizonDays} days`}
          icon={ArrowUpCircle}
          tone="income"
        />
        <KpiCard
          title="Upcoming expenses"
          value={formatCurrency(upcoming.expenses, currency, locale)}
          helper={`Next ${upcoming.horizonDays} days`}
          icon={ArrowDownCircle}
          tone="expense"
        />
        <KpiCard
          title="Upcoming net"
          value={formatCurrency(upcoming.net, currency, locale)}
          helper="Projected change"
          icon={CalendarClock}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next {upcoming.horizonDays} days</CardTitle>
          <CardDescription>
            Generated from active recurring rules. Skipped occurrences are excluded. Edit one without affecting the series.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UpcomingList
            items={upcoming.items}
            currency={currency}
            locale={locale}
            emptyMessage="No recurring items land in the next 30 days. Add a recurring rule to project future cash flow."
          />
        </CardContent>
      </Card>
    </section>
  );
}
