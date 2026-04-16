import { endOfMonth, startOfMonth } from "date-fns";

import { prisma } from "@/lib/db/client";
import { calculateSummary, categoryBreakdown } from "@/lib/domain/reports/calculations";
import { getUpcomingCashFlow } from "@/lib/domain/recurring/service";
import { getRecentMonthlyChart } from "@/lib/domain/reports/service";
import { getWorkspace } from "@/lib/domain/workspace/service";

export async function getDashboardData() {
  const workspace = await getWorkspace();
  const start = startOfMonth(new Date());
  const end = endOfMonth(start);

  const [currentMonthTransactions, recentTransactions, monthlyChart, upcoming] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        workspaceId: workspace.id,
        date: { gte: start, lte: end }
      },
      include: { category: true },
      orderBy: { date: "desc" }
    }),
    prisma.transaction.findMany({
      where: { workspaceId: workspace.id },
      include: { category: true },
      orderBy: { date: "desc" },
      take: 8
    }),
    getRecentMonthlyChart(4),
    getUpcomingCashFlow()
  ]);

  return {
    workspace,
    summary: calculateSummary(currentMonthTransactions),
    spendByCategory: categoryBreakdown(currentMonthTransactions),
    monthlyChart,
    recentTransactions,
    upcoming,
    hasTransactions: recentTransactions.length > 0
  };
}
