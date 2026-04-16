import { notFound } from "next/navigation";

import { RecurringForm } from "@/components/recurring/recurring-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listCategories } from "@/lib/domain/categories/service";
import { formatCurrency } from "@/lib/domain/format/currency";
import { getRecurringRule } from "@/lib/domain/recurring/service";
import { getWorkspace } from "@/lib/domain/workspace/service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditRecurringRulePage({ params }: PageProps) {
  const { id } = await params;
  const [workspace, categories, rule] = await Promise.all([
    getWorkspace(),
    listCategories(),
    getRecurringRule(id)
  ]);

  if (!rule) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit recurring rule</CardTitle>
          <CardDescription>
            Update {rule.payee} · {formatCurrency(rule.amount, workspace.currency, workspace.locale)}. Editing the rule
            affects future occurrences only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecurringForm
            categories={categories}
            currency={workspace.currency}
            locale={workspace.locale}
            ruleId={rule.id}
            initialValues={{
              payee: rule.payee,
              type: rule.type as "INCOME" | "EXPENSE",
              amount: String(rule.amount / 100),
              categoryId: rule.categoryId,
              frequency: rule.frequency as "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY",
              startDate: rule.startDate,
              endDate: rule.endDate ?? "",
              note: rule.note ?? "",
              paymentMethod: rule.paymentMethod ?? "",
              status: rule.status as "ACTIVE" | "PAUSED" | "ENDED"
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
