import { notFound } from "next/navigation";

import { RecurringForm } from "@/components/recurring/recurring-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listCategories } from "@/lib/domain/categories/service";
import { getRecurringRule } from "@/lib/domain/recurring/service";
import { getWorkspace } from "@/lib/domain/workspace/service";
import type { RecurringFrequency } from "@/lib/domain/constants";
import { toDateInputValue } from "@/lib/domain/format/date";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditRecurringPage({ params }: PageProps) {
  const { id } = await params;
  const [workspace, categories, rule] = await Promise.all([
    getWorkspace(),
    listCategories(),
    getRecurringRule(id)
  ]);
  if (!rule) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit recurring rule</CardTitle>
          <CardDescription>Update {rule.payee}. Changing frequency or dates resets per-occurrence skips and edits.</CardDescription>
        </CardHeader>
        <CardContent>
          <RecurringForm
            categories={categories}
            ruleId={rule.id}
            currency={workspace.currency}
            locale={workspace.locale}
            initialValues={{
              payee: rule.payee,
              type: rule.type as "INCOME" | "EXPENSE",
              amount: String(rule.amount / 100),
              categoryId: rule.categoryId,
              frequency: rule.frequency as RecurringFrequency,
              startDate: toDateInputValue(rule.startDate),
              endDate: rule.endDate ? toDateInputValue(rule.endDate) : "",
              note: rule.note ?? "",
              paymentMethod: rule.paymentMethod ?? ""
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
