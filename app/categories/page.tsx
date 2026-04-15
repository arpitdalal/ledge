import { CategoryForm } from "@/components/categories/category-form";
import { CategoryList } from "@/components/categories/category-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listCategories } from "@/lib/domain/categories/service";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Categories</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Default and custom labels for income and spending.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create category</CardTitle>
          <CardDescription>Use focused category names so reports stay readable.</CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryForm />
        </CardContent>
      </Card>

      <CategoryList categories={categories} />
    </div>
  );
}
