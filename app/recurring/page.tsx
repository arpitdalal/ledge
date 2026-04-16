import Link from "next/link";
import { Plus } from "lucide-react";

import { RecurringList } from "@/components/recurring/recurring-list";
import { UpcomingList } from "@/components/recurring/upcoming-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/domain/format/currency";
import { getUpcomingCashFlow, listRecurringRules } from "@/lib/domain/recurring/service";
import { getWorkspace } from "@/lib/domain/workspace/service";

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const [workspace, rows, upcoming] = await Promise.all([
    getWorkspace(),
    listRecurringRules(),
    getUpcomingCashFlow()
  ]);

  const activeCount = rows.filter(({ rule }) => rule.status === "ACTIVE").length;
  const pausedCount = rows.filter(({ rule }) => rule.status === "PAUSED").length;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Recurring</h1>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            Automate predictable income and expenses. Rules project future cash flow without posting real transactions.
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
          description="Add your first rule to project upcoming cash flow on the dashboard and keep recurring expenses off your weekly checklist."
          action={
            <Button asChild>
              <Link href="/recurring/new">Create first rule</Link>
            </Button>
          }
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3" aria-label="Recurring summary">
            <SummaryTile label="Active rules" value={String(activeCount)} />
            <SummaryTile label="Paused rules" value={String(pausedCount)} />
            <SummaryTile
              label={`Next ${upcoming.horizonDays} days net`}
              value={formatCurrency(upcoming.summary.net, workspace.currency, workspace.locale)}
              tone={upcoming.summary.net >= 0 ? "income" : "expense"}
            />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Rules</CardTitle>
              <CardDescription>
                {rows.length} rule{rows.length === 1 ? "" : "s"} in this workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecurringList rows={rows} currency={workspace.currency} locale={workspace.locale} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming occurrences</CardTitle>
              <CardDescription>
                Next {upcoming.horizonDays} days of generated occurrences. Skip one without affecting the rest of the series.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UpcomingList
                occurrences={upcoming.occurrences}
                currency={workspace.currency}
                locale={workspace.locale}
                emptyHint="No upcoming occurrences inside the current horizon."
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "income" | "expense";
}) {
  const toneClass =
    tone === "income" ? "text-emerald-600" : tone === "expense" ? "text-rose-600" : "";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm text-[hsl(var(--muted-foreground))]">{label}</div>
        <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
