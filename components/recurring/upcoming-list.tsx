"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarClock, MoreHorizontal, SkipForward } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { skipOccurrenceAction } from "@/lib/domain/recurring/actions";
import { formatCurrency } from "@/lib/domain/format/currency";
import { formatDate } from "@/lib/domain/format/date";
import type { UpcomingOccurrence } from "@/lib/domain/recurring/service";

export function UpcomingList({
  items,
  currency,
  locale,
  compact = false,
  emptyMessage = "No upcoming recurring items in this horizon."
}: {
  items: UpcomingOccurrence[];
  currency: string;
  locale: string;
  compact?: boolean;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead className="hidden sm:table-cell">Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            {!compact && <TableHead className="w-28 text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <UpcomingRow
              key={`${item.ruleId}:${item.scheduledIso}`}
              item={item}
              currency={currency}
              locale={locale}
              compact={compact}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function UpcomingRow({
  item,
  currency,
  locale,
  compact
}: {
  item: UpcomingOccurrence;
  currency: string;
  locale: string;
  compact: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const skip = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await skipOccurrenceAction(item.ruleId, item.scheduledIso);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <TableRow className="bg-[hsl(var(--muted)/0.25)]">
      <TableCell>
        <div className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" aria-hidden />
          <div>
            <div className="font-medium">{item.payee}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
              <Badge variant="outline">Upcoming</Badge>
              {item.isModified && <Badge variant="secondary">Edited</Badge>}
              <Badge variant={item.type === "INCOME" ? "income" : "expense"}>
                {item.type === "INCOME" ? "Income" : "Expense"}
              </Badge>
              <span className="md:hidden">{item.category.name}</span>
              <span className="sm:hidden">{formatDate(item.effectiveDate)}</span>
            </div>
            {item.note && (
              <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{item.note}</div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">{item.category.name}</TableCell>
      <TableCell className="hidden sm:table-cell">{formatDate(item.effectiveDate)}</TableCell>
      <TableCell
        className={`text-right font-semibold ${item.type === "INCOME" ? "text-emerald-600" : "text-rose-600"}`}
      >
        {item.type === "INCOME" ? "+" : "-"}
        {formatCurrency(item.amount, currency, locale)}
      </TableCell>
      {!compact && (
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={skip}
              disabled={isPending}
              aria-label={`Skip ${item.payee} on ${formatDate(item.effectiveDate)}`}
              title="Skip this occurrence"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label={`Manage rule for ${item.payee}`}
              title="Manage rule"
            >
              <a href={`/recurring/${item.ruleId}/edit`}>
                <MoreHorizontal className="h-4 w-4" />
              </a>
            </Button>
          </div>
          {message && (
            <p className="mt-1 text-xs text-rose-600">{message}</p>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
