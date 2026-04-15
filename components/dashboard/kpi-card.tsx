import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function KpiCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = "neutral"
}: {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone?: "neutral" | "income" | "expense";
}) {
  const toneClass =
    tone === "income"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : tone === "expense"
        ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
        : "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{title}</CardTitle>
        <span className={`grid h-9 w-9 place-items-center rounded-md ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{helper}</p>
      </CardContent>
    </Card>
  );
}
