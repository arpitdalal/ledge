import Link from "next/link";
import { Plus } from "lucide-react";

import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionList } from "@/components/transactions/transaction-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listCategories } from "@/lib/domain/categories/service";
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

  const [workspace, categories, transactions] = await Promise.all([
    getWorkspace(),
    listCategories(),
    listTransactions(filters)
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
