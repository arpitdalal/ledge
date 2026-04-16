import { CalendarClock, Repeat, SkipForward } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { skipRecurringOccurrenceFormAction } from "@/lib/domain/recurring/actions";
import { formatCurrency } from "@/lib/domain/format/currency";
import { formatDate } from "@/lib/domain/format/date";
import { scheduledDateKey } from "@/lib/domain/recurring/recurrence";
import type { UpcomingOccurrence } from "@/lib/domain/recurring/service";

export function UpcomingList({
  occurrences,
  currency,
  locale,
  showSkipAction = true,
  emptyHint
}: {
  occurrences: UpcomingOccurrence[];
  currency: string;
  locale: string;
  showSkipAction?: boolean;
  emptyHint?: string;
}) {
  if (occurrences.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
        {emptyHint ?? "No upcoming recurring cash flow."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Payee</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead className="hidden sm:table-cell">Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            {showSkipAction && <TableHead className="w-28 text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {occurrences.map((occurrence) => {
            const dateKey = scheduledDateKey(occurrence.scheduledDate);
            return (
              <TableRow
                key={`${occurrence.ruleId}-${occurrence.scheduledDate.toISOString()}`}
                data-upcoming="true"
                className="bg-[hsl(var(--muted)/0.35)]"
              >
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    <Repeat className="h-4 w-4 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
                    {occurrence.payee}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                    <Badge variant="outline">
                      <CalendarClock className="mr-1 h-3 w-3" aria-hidden="true" />
                      {occurrence.status === "EDITED" ? "Edited upcoming" : "Upcoming"}
                    </Badge>
                    <Badge variant={occurrence.type === "INCOME" ? "income" : "expense"}>
                      {occurrence.type === "INCOME" ? "Income" : "Expense"}
                    </Badge>
                    <span className="md:hidden">{occurrence.category.name}</span>
                    <span className="sm:hidden">{formatDate(occurrence.date)}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{occurrence.category.name}</TableCell>
                <TableCell className="hidden sm:table-cell">{formatDate(occurrence.date)}</TableCell>
                <TableCell
                  className={`text-right font-semibold ${
                    occurrence.type === "INCOME" ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {occurrence.type === "INCOME" ? "+" : "-"}
                  {formatCurrency(occurrence.amount, currency, locale)}
                </TableCell>
                {showSkipAction && (
                  <TableCell className="text-right">
                    <form
                      action={skipRecurringOccurrenceFormAction.bind(null, occurrence.ruleId, dateKey)}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Skip ${occurrence.payee} on ${formatDate(occurrence.date)}`}
                      >
                        <SkipForward className="h-4 w-4" />
                        Skip
                      </Button>
                    </form>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
