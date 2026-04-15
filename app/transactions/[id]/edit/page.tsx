import { notFound } from "next/navigation";

import { TransactionForm } from "@/components/transactions/transaction-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/domain/format/currency";
import { listCategories } from "@/lib/domain/categories/service";
import { getTransaction } from "@/lib/domain/transactions/service";
import { getWorkspace } from "@/lib/domain/workspace/service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTransactionPage({ params }: PageProps) {
  const { id } = await params;
  const [workspace, categories, transaction] = await Promise.all([getWorkspace(), listCategories(), getTransaction(id)]);

  if (!transaction) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit transaction</CardTitle>
          <CardDescription>Update {transaction.payee} for {formatCurrency(transaction.amount, workspace.currency, workspace.locale)}.</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionForm
            categories={categories}
            transactionId={transaction.id}
            initialValues={{
              amount: String(transaction.amount / 100),
              type: transaction.type as "INCOME" | "EXPENSE",
              date: transaction.date,
              categoryId: transaction.categoryId,
              payee: transaction.payee,
              note: transaction.note ?? "",
              paymentMethod: transaction.paymentMethod ?? ""
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
