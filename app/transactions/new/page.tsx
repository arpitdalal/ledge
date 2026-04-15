import { TransactionForm } from "@/components/transactions/transaction-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listCategories } from "@/lib/domain/categories/service";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  const categories = await listCategories();

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Add transaction</CardTitle>
          <CardDescription>Record income or expense in the local workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionForm categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
