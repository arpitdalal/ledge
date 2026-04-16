import Link from "next/link";
import { Edit, Pause, Play, Repeat, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  deleteRecurringRuleFormAction,
  toggleRecurringRuleStatusFormAction
} from "@/lib/domain/recurring/actions";
import { formatCurrency } from "@/lib/domain/format/currency";
import { formatDate } from "@/lib/domain/format/date";
import type { GeneratedOccurrence } from "@/lib/domain/recurring/recurrence";
import type { RecurringRuleWithRelations } from "@/lib/domain/recurring/service";

const frequencyLabels: Record<string, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Every 2 weeks",
  MONTHLY: "Monthly",
  YEARLY: "Yearly"
};

function statusLabel(status: string) {
  if (status === "ACTIVE") return "Active";
  if (status === "PAUSED") return "Paused";
  return "Ended";
}

function statusVariant(status: string): "income" | "outline" | "secondary" {
  if (status === "ACTIVE") return "income";
  if (status === "PAUSED") return "outline";
  return "secondary";
}

export function RecurringList({
  rows,
  currency,
  locale
}: {
  rows: Array<{ rule: RecurringRuleWithRelations; nextOccurrence: GeneratedOccurrence | null }>;
  currency: string;
  locale: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rule</TableHead>
            <TableHead className="hidden md:table-cell">Frequency</TableHead>
            <TableHead className="hidden lg:table-cell">Next occurrence</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-48 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ rule, nextOccurrence }) => {
            const isActive = rule.status === "ACTIVE";
            const nextLabel = nextOccurrence ? formatDate(nextOccurrence.date) : rule.status === "PAUSED" ? "Paused" : "—";
            const toggleTarget = isActive ? "PAUSED" : "ACTIVE";
            return (
              <TableRow key={rule.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <span className="font-medium">{rule.payee}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                    <Badge variant={rule.type === "INCOME" ? "income" : "expense"}>
                      {rule.type === "INCOME" ? "Income" : "Expense"}
                    </Badge>
                    <Badge variant={statusVariant(rule.status)}>{statusLabel(rule.status)}</Badge>
                    <span>{rule.category.name}</span>
                    <span className="md:hidden">· {frequencyLabels[rule.frequency] ?? rule.frequency}</span>
                    {nextOccurrence && <span className="lg:hidden">· Next {formatDate(nextOccurrence.date)}</span>}
                  </div>
                  {rule.note && (
                    <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{rule.note}</p>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">{frequencyLabels[rule.frequency] ?? rule.frequency}</TableCell>
                <TableCell className="hidden lg:table-cell">{nextLabel}</TableCell>
                <TableCell
                  className={`text-right font-semibold ${rule.type === "INCOME" ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {rule.type === "INCOME" ? "+" : "-"}
                  {formatCurrency(rule.amount, currency, locale)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <form action={toggleRecurringRuleStatusFormAction.bind(null, rule.id, toggleTarget)}>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={isActive ? `Pause ${rule.payee}` : `Resume ${rule.payee}`}
                      >
                        {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    </form>
                    <Button asChild variant="ghost" size="icon" aria-label={`Edit ${rule.payee}`}>
                      <Link href={`/recurring/${rule.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <form action={deleteRecurringRuleFormAction.bind(null, rule.id)}>
                      <Button variant="ghost" size="icon" aria-label={`Delete ${rule.payee}`}>
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
