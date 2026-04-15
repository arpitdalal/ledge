import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/client";
import { getMonthlyReport, getRecentMonthlyChart, normalizeReportPeriod } from "@/lib/domain/reports/service";

describe("report aggregation", () => {
  beforeEach(async () => {
    await prisma.transaction.deleteMany();
    await prisma.category.deleteMany();
    await prisma.workspace.deleteMany();

    const workspace = await prisma.workspace.create({
      data: { name: "Reports", currency: "CAD", locale: "en-CA" }
    });
    const salary = await prisma.category.create({
      data: { workspaceId: workspace.id, name: "Salary", type: "INCOME", color: "emerald", icon: "briefcase", isDefault: true }
    });
    const rent = await prisma.category.create({
      data: { workspaceId: workspace.id, name: "Rent", type: "EXPENSE", color: "rose", icon: "home", isDefault: true }
    });

    await prisma.transaction.createMany({
      data: [
        {
          workspaceId: workspace.id,
          categoryId: salary.id,
          type: "INCOME",
          amount: 500000,
          date: new Date("2026-04-01T12:00:00"),
          payee: "Studio"
        },
        {
          workspaceId: workspace.id,
          categoryId: rent.id,
          type: "EXPENSE",
          amount: 200000,
          date: new Date("2026-04-02T12:00:00"),
          payee: "Landlord"
        }
      ]
    });
  });

  it("aggregates selected month totals", async () => {
    const report = await getMonthlyReport(2026, 4);

    expect(report.summary).toMatchObject({
      income: 500000,
      expenses: 200000,
      net: 300000,
      count: 2
    });
    expect(report.categoryBreakdown[0]).toMatchObject({ name: "Rent", amount: 200000 });
  });

  it("returns an empty report for months without transactions", async () => {
    const report = await getMonthlyReport(2026, 5);

    expect(report.transactions).toEqual([]);
    expect(report.summary).toEqual({ income: 0, expenses: 0, net: 0, count: 0 });
    expect(report.categoryBreakdown).toEqual([]);
    expect(report.largestExpenses).toEqual([]);
  });

  it("normalizes invalid report period params to safe values", () => {
    expect(normalizeReportPeriod(Number.NaN, Number.NaN, new Date(2026, 3, 1))).toEqual({
      year: 2026,
      month: 4
    });
    expect(normalizeReportPeriod(1999, 13, new Date(2026, 3, 1))).toEqual({
      year: 2026,
      month: 4
    });
  });

  it("builds recent chart periods from stored transactions", async () => {
    await prisma.transaction.deleteMany();
    const workspace = await prisma.workspace.findFirstOrThrow();
    const [salary, rent] = await Promise.all([
      prisma.category.findFirstOrThrow({ where: { workspaceId: workspace.id, name: "Salary" } }),
      prisma.category.findFirstOrThrow({ where: { workspaceId: workspace.id, name: "Rent" } })
    ]);
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 2, 12);
    await prisma.transaction.createMany({
      data: [
        {
          workspaceId: workspace.id,
          categoryId: salary.id,
          type: "INCOME",
          amount: 500000,
          date: currentMonth,
          payee: "Studio"
        },
        {
          workspaceId: workspace.id,
          categoryId: rent.id,
          type: "EXPENSE",
          amount: 200000,
          date: currentMonth,
          payee: "Landlord"
        }
      ]
    });

    const chart = await getRecentMonthlyChart(2);

    expect(chart).toHaveLength(2);
    expect(chart.at(-1)).toMatchObject({
      income: 500000,
      expenses: 200000,
      net: 300000
    });
  });
});
