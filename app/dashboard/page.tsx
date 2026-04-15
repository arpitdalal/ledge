import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, Landmark, ListChecks, Plus, Tags } from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { MonthlyIncomeExpenseChart, SpendByCategoryChart } from "@/components/dashboard/dashboard-charts";
import { TransactionList } from "@/components/transactions/transaction-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getDashboardData } from "@/lib/domain/dashboard/service";
import { formatCurrency } from "@/lib/domain/format/currency";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const { currency, locale } = data.workspace;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Dashboard</h1>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            A personal cash flow tracker for understanding spending, income, and upcoming obligations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/transactions/new">
              <Plus className="h-4 w-4" />
              Add transaction
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/categories">
              <Tags className="h-4 w-4" />
              Manage categories
            </Link>
          </Button>
        </div>
      </div>

      {!data.hasTransactions ? (
        <EmptyState
          title="No transactions yet"
          description="Add your first transaction or reset demo data from Settings to see the full dashboard."
          action={
            <Button asChild>
              <Link href="/transactions/new">Add transaction</Link>
            </Button>
          }
        />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Current month summary">
            <KpiCard title="Income" value={formatCurrency(data.summary.income, currency, locale)} helper="Current month" icon={ArrowUpCircle} tone="income" />
            <KpiCard title="Expenses" value={formatCurrency(data.summary.expenses, currency, locale)} helper="Current month" icon={ArrowDownCircle} tone="expense" />
            <KpiCard title="Net cash flow" value={formatCurrency(data.summary.net, currency, locale)} helper="Income minus expenses" icon={Landmark} />
            <KpiCard title="Transactions" value={String(data.summary.count)} helper="Current month" icon={ListChecks} />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Spend by category</CardTitle>
                <CardDescription>Expense mix for the current month.</CardDescription>
              </CardHeader>
              <CardContent>
                <SpendByCategoryChart data={data.spendByCategory} currency={currency} locale={locale} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Income vs expense</CardTitle>
                <CardDescription>Recent monthly cash flow.</CardDescription>
              </CardHeader>
              <CardContent>
                <MonthlyIncomeExpenseChart data={data.monthlyChart} currency={currency} locale={locale} />
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Recent transactions</CardTitle>
                <CardDescription>Latest activity in the local workspace.</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/transactions">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <TransactionList transactions={data.recentTransactions} currency={currency} locale={locale} compact />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
