import { endOfMonth, startOfMonth, subMonths } from "date-fns";

import { prisma } from "@/lib/db/client";
import { calculateSummary, categoryBreakdown, largestExpenses, monthlyIncomeExpense } from "@/lib/domain/reports/calculations";
import { getWorkspace } from "@/lib/domain/workspace/service";

const YEAR_MIN = 2000;
const YEAR_MAX = 2100;
const MONTH_MIN = 1;
const MONTH_MAX = 12;

export async function getMonthlyReport(year: number, month: number) {
  const workspace = await getWorkspace();
  const period = normalizeReportPeriod(year, month);
  const start = startOfMonth(new Date(period.year, period.month - 1, 1));
  const end = endOfMonth(start);

  const transactions = await prisma.transaction.findMany({
    where: {
      workspaceId: workspace.id,
      date: {
        gte: start,
        lte: end
      }
    },
    include: { category: true },
    orderBy: { date: "desc" }
  });

  return {
    workspace,
    transactions,
    summary: calculateSummary(transactions),
    categoryBreakdown: categoryBreakdown(transactions),
    largestExpenses: largestExpenses(transactions)
  };
}

export async function getRecentMonthlyChart(months = 6) {
  const workspace = await getWorkspace();
  const start = startOfMonth(subMonths(new Date(), months - 1));
  const transactions = await prisma.transaction.findMany({
    where: {
      workspaceId: workspace.id,
      date: { gte: start }
    },
    include: { category: true },
    orderBy: { date: "asc" }
  });

  return monthlyIncomeExpense(transactions, months);
}

export function normalizeReportPeriod(year: number, month: number, referenceDate = new Date()) {
  const fallbackYear = referenceDate.getFullYear();
  const fallbackMonth = referenceDate.getMonth() + 1;

  return {
    year: coerceInteger(year, fallbackYear, YEAR_MIN, YEAR_MAX),
    month: coerceInteger(month, fallbackMonth, MONTH_MIN, MONTH_MAX)
  };
}

function coerceInteger(value: number, fallback: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.trunc(value);
  if (normalized < min || normalized > max) {
    return fallback;
  }

  return normalized;
}
