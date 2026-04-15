"use client";

import {
  Briefcase,
  Car,
  Home,
  Laptop,
  type LucideIcon,
  Repeat,
  RotateCcw,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Ticket,
  Trash2,
  Utensils,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CategoryForm } from "@/components/categories/category-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteCategoryAction } from "@/lib/domain/categories/actions";
import type { CategoryWithCount } from "@/lib/domain/categories/service";
import type { CategoryFormValues } from "@/lib/validation/category";

const colorClasses: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200",
  zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
  emerald:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-200",
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-200",
  indigo:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200",
  violet:
    "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
};

const categoryIcons: Record<CategoryFormValues["icon"], LucideIcon> = {
  home: Home,
  cart: ShoppingCart,
  bolt: Zap,
  car: Car,
  utensils: Utensils,
  bag: ShoppingBag,
  shield: Shield,
  ticket: Ticket,
  repeat: Repeat,
  briefcase: Briefcase,
  laptop: Laptop,
  "rotate-ccw": RotateCcw,
};

export function CategoryList({
  categories,
}: {
  categories: CategoryWithCount[];
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {categories.map((category) => (
        <CategoryCard key={category.id} category={category} />
      ))}
    </div>
  );
}

function CategoryCard({ category }: { category: CategoryWithCount }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function remove() {
    setMessage(null);
    startTransition(async () => {
      const result = await deleteCategoryAction(category.id);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      router.refresh();
    });
  }

  const CategoryIcon =
    categoryIcons[category.icon as CategoryFormValues["icon"]] ?? ShoppingCart;

  return (
    <Card>
      <CardContent className="grid gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`grid h-10 w-10 place-items-center rounded-md ${colorClasses[category.color] ?? colorClasses.slate}`}
            >
              <CategoryIcon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <div className="font-medium">{category.name}</div>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge
                  variant={category.type === "INCOME" ? "income" : "expense"}
                >
                  {category.type === "INCOME" ? "Income" : "Expense"}
                </Badge>
                {category.isDefault && <Badge variant="outline">Default</Badge>}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={remove}
            disabled={isPending}
            aria-label={`Delete ${category.name}`}
          >
            <Trash2 className="h-4 w-4 text-rose-600" />
          </Button>
        </div>
        <div className="text-sm text-[hsl(var(--muted-foreground))]">
          {category._count.transactions} transaction
          {category._count.transactions === 1 ? "" : "s"}
        </div>
        {message && (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {message}
          </p>
        )}
        {!category.isDefault && (
          <details
            open={open}
            onToggle={(event) => setOpen(event.currentTarget.open)}
          >
            <summary className="cursor-pointer rounded-md text-sm font-medium text-[hsl(var(--primary))] outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]">
              Edit
            </summary>
            <div className="mt-4">
              <CategoryForm
                categoryId={category.id}
                initialValues={{
                  name: category.name,
                  type: category.type as "INCOME" | "EXPENSE",
                  color: category.color as CategoryFormValues["color"],
                  icon: category.icon as CategoryFormValues["icon"],
                }}
                onDone={() => setOpen(false)}
              />
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
