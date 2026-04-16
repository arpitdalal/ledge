import { RecurringForm } from "@/components/recurring/recurring-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listCategories } from "@/lib/domain/categories/service";
import { getWorkspace } from "@/lib/domain/workspace/service";

export const dynamic = "force-dynamic";

export default async function NewRecurringPage() {
  const [workspace, categories] = await Promise.all([getWorkspace(), listCategories()]);

  return (
    <div className="mx-auto max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle>New recurring rule</CardTitle>
          <CardDescription>
            Describe how often this cash flow repeats. Preview updates live on the right.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecurringForm
            categories={categories}
            currency={workspace.currency}
            locale={workspace.locale}
          />
        </CardContent>
      </Card>
    </div>
  );
}
