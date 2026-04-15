import Link from "next/link";
import { Edit, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteTransactionFormAction } from "@/lib/domain/transactions/actions";
import { formatCurrency } from "@/lib/domain/format/currency";
import { formatDate } from "@/lib/domain/format/date";
import type { TransactionWithCategory } from "@/lib/domain/transactions/service";

export function TransactionList({
  transactions,
  currency,
  locale,
  compact = false
}: {
  transactions: TransactionWithCategory[];
  currency: string;
  locale: string;
  compact?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Payee</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead className="hidden sm:table-cell">Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            {!compact && <TableHead className="w-32 text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                <div className="font-medium">{transaction.payee}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                  <Badge variant={transaction.type === "INCOME" ? "income" : "expense"}>
                    {transaction.type === "INCOME" ? "Income" : "Expense"}
                  </Badge>
                  <span className="md:hidden">{transaction.category.name}</span>
                  <span className="sm:hidden">{formatDate(transaction.date)}</span>
                </div>
                {transaction.note && <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{transaction.note}</div>}
              </TableCell>
              <TableCell className="hidden md:table-cell">{transaction.category.name}</TableCell>
              <TableCell className="hidden sm:table-cell">{formatDate(transaction.date)}</TableCell>
              <TableCell className={`text-right font-semibold ${transaction.type === "INCOME" ? "text-emerald-600" : "text-rose-600"}`}>
                {transaction.type === "INCOME" ? "+" : "-"}
                {formatCurrency(transaction.amount, currency, locale)}
              </TableCell>
              {!compact && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="ghost" size="icon" aria-label={`Edit ${transaction.payee}`}>
                      <Link href={`/transactions/${transaction.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <form action={deleteTransactionFormAction.bind(null, transaction.id)}>
                      <Button variant="ghost" size="icon" aria-label={`Delete ${transaction.payee}`}>
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </form>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
