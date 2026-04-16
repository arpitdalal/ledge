import Link from "next/link";
import { CalendarClock, Plus } from "lucide-react";

import { UpcomingList } from "@/components/recurring/upcoming-list";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionList } from "@/components/transactions/transaction-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listCategories } from "@/lib/domain/categories/service";
import { getUpcomingCashFlow } from "@/lib/domain/recurring/service";
import { listTransactions } from "@/lib/domain/transactions/service";
import { getWorkspace } from "@/lib/domain/workspace/service";
import type { TransactionFilterInput, TransactionSort } from "@/lib/domain/transactions/filters";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function TransactionsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const normalized = {
    q: first(params.q),
    month: first(params.month),
    year: first(params.year),
    type: first(params.type),
    categoryId: first(params.categoryId),
    sort: first(params.sort)
  };
  const filters: TransactionFilterInput = {
    search: normalized.q,
    month: normalized.month ? Number(normalized.month) : undefined,
    year: normalized.year ? Number(normalized.year) : undefined,
    type: normalized.type === "INCOME" || normalized.type === "EXPENSE" ? normalized.type : "ALL",
    categoryId: normalized.categoryId,
    sort: (normalized.sort as TransactionSort | undefined) ?? "newest"
  };

  const [workspace, categories, transactions, upcoming] = await Promise.all([
    getWorkspace(),
    listCategories(),
    listTransactions(filters),
    getUpcomingCashFlow()
  ]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Transactions</h1>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Search, filter, add, and edit cash flow records.</p>
        </div>
        <Button asChild>
          <Link href="/transactions/new">
            <Plus className="h-4 w-4" />
            Add transaction
          </Link>
        </Button>
      </div>

      <TransactionFilters categories={categories} searchParams={normalized} />

      {upcoming.items.length > 0 && (
        <Card aria-label="Upcoming recurring items">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-md bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]">
                <CalendarClock className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <CardTitle>Upcoming from recurring</CardTitle>
                <CardDescription>
                  Generated from active rules — not posted. Skip one or edit the rule in Recurring.
                </CardDescription>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/recurring">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <UpcomingList
              items={upcoming.items.slice(0, 5)}
              currency={workspace.currency}
              locale={workspace.locale}
              compact
            />
          </CardContent>
        </Card>
      )}

      {transactions.length === 0 ? (
        <EmptyState
          title="No transactions match"
          description="Adjust filters or add a new transaction."
          action={
            <Button asChild>
              <Link href="/transactions/new">Add transaction</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All transactions</CardTitle>
            <CardDescription>
              {transactions.length} result{transactions.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TransactionList transactions={transactions} currency={workspace.currency} locale={workspace.locale} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
