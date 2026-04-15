import { format } from "date-fns";

import { CategoryBreakdownChart } from "@/components/reports/reports-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getMonthlyReport, normalizeReportPeriod } from "@/lib/domain/reports/service";
import { formatCurrency } from "@/lib/domain/format/currency";
import { formatDate } from "@/lib/domain/format/date";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: format(new Date(2026, index, 1), "MMMM")
}));

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const now = new Date();
  const parsedMonth = Number(first(params.month) ?? now.getMonth() + 1);
  const parsedYear = Number(first(params.year) ?? now.getFullYear());
  const { month: selectedMonth, year: selectedYear } = normalizeReportPeriod(parsedYear, parsedMonth, now);
  const report = await getMonthlyReport(selectedYear, selectedMonth);
  const { workspace, summary } = report;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Reports</h1>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Monthly summary, category breakdown, and largest expenses.</p>
        </div>
        <form className="flex flex-col gap-2 sm:flex-row" action="/reports">
          <Select name="month" defaultValue={String(selectedMonth)} aria-label="Report month">
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </Select>
          <Input name="year" type="number" defaultValue={selectedYear} min="2000" max="2100" aria-label="Report year" />
          <Button type="submit">View</Button>
        </form>
      </div>

      {report.transactions.length === 0 ? (
        <EmptyState title="No report data" description="No transactions exist for the selected period." />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <SummaryTile label="Income" value={formatCurrency(summary.income, workspace.currency, workspace.locale)} tone="income" />
            <SummaryTile label="Expenses" value={formatCurrency(summary.expenses, workspace.currency, workspace.locale)} tone="expense" />
            <SummaryTile label="Net" value={formatCurrency(summary.net, workspace.currency, workspace.locale)} />
            <SummaryTile label="Transactions" value={String(summary.count)} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Category breakdown</CardTitle>
                <CardDescription>Expense totals for {monthOptions[selectedMonth - 1]?.label} {selectedYear}.</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryBreakdownChart data={report.categoryBreakdown} currency={workspace.currency} locale={workspace.locale} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Largest expenses</CardTitle>
                <CardDescription>Highest individual outflows.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {report.largestExpenses.map((transaction) => (
                  <div key={transaction.payee + transaction.date.toISOString()} className="flex items-center justify-between gap-4 rounded-md border p-3">
                    <div>
                      <div className="font-medium">{transaction.payee}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                        <Badge variant="outline">{transaction.category.name}</Badge>
                        <span>{formatDate(transaction.date)}</span>
                      </div>
                    </div>
                    <div className="font-semibold text-rose-600">{formatCurrency(transaction.amount, workspace.currency, workspace.locale)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function SummaryTile({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "income" | "expense" }) {
  const toneClass = tone === "income" ? "text-emerald-600" : tone === "expense" ? "text-rose-600" : "";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm text-[hsl(var(--muted-foreground))]">{label}</div>
        <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
