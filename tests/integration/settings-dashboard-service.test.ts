import { beforeEach, describe, expect, it } from "vitest";
import { addDays, subMonths } from "date-fns";

import { prisma } from "@/lib/db/client";
import { seedDemoData } from "@/lib/db/demo";
import { getDashboardData } from "@/lib/domain/dashboard/service";
import { resetDemoWorkspace, updateSettings } from "@/lib/domain/settings/service";

async function seedBase() {
  await prisma.recurringOccurrence.deleteMany();
  await prisma.recurringRule.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.workspace.deleteMany();

  const workspace = await prisma.workspace.create({
    data: { name: "Settings", currency: "CAD", locale: "en-CA" }
  });
  const salary = await prisma.category.create({
    data: {
      workspaceId: workspace.id,
      name: "Salary",
      type: "INCOME",
      color: "emerald",
      icon: "briefcase",
      isDefault: true
    }
  });
  const rent = await prisma.category.create({
    data: {
      workspaceId: workspace.id,
      name: "Rent",
      type: "EXPENSE",
      color: "rose",
      icon: "home",
      isDefault: true
    }
  });

  return { workspace, salary, rent };
}

describe("settings and dashboard services", () => {
  beforeEach(seedBase);

  it("validates and persists workspace settings", async () => {
    const invalid = await updateSettings({ name: "", currency: "CAD", locale: "en-CA" });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.errors.name?.[0]).toBe("Workspace name is required.");

    const updated = await updateSettings({
      name: "Household",
      currency: "USD",
      locale: "en-US"
    });

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.workspace).toMatchObject({
      name: "Household",
      currency: "USD",
      locale: "en-US"
    });
  });

  it("resets demo data to the seeded baseline", async () => {
    await prisma.workspace.updateMany({ data: { name: "Changed", currency: "USD" } });
    await prisma.category.create({
      data: {
        workspaceId: (await prisma.workspace.findFirstOrThrow()).id,
        name: "Temporary",
        type: "EXPENSE",
        color: "slate",
        icon: "cart"
      }
    });

    await expect(resetDemoWorkspace()).resolves.toEqual({ ok: true });

    const workspace = await prisma.workspace.findFirstOrThrow();
    const temporary = await prisma.category.findFirst({ where: { name: "Temporary" } });
    const transactionCount = await prisma.transaction.count();

    expect(workspace).toMatchObject({ name: "Personal", currency: "CAD", locale: "en-CA" });
    expect(temporary).toBeNull();
    expect(transactionCount).toBeGreaterThan(0);
  });

  it("builds dashboard data from the current month and recent transactions", async () => {
    const { workspace, salary, rent } = await seedBase();
    const now = new Date();
    const currentIncomeDate = addDays(new Date(now.getFullYear(), now.getMonth(), 1, 12), 1);
    const currentExpenseDate = addDays(new Date(now.getFullYear(), now.getMonth(), 1, 12), 2);
    const previousMonthDate = subMonths(currentExpenseDate, 1);

    await prisma.transaction.createMany({
      data: [
        {
          workspaceId: workspace.id,
          categoryId: salary.id,
          type: "INCOME",
          amount: 300000,
          date: currentIncomeDate,
          payee: "Northstar Studio"
        },
        {
          workspaceId: workspace.id,
          categoryId: rent.id,
          type: "EXPENSE",
          amount: 120000,
          date: currentExpenseDate,
          payee: "Landlord"
        },
        {
          workspaceId: workspace.id,
          categoryId: rent.id,
          type: "EXPENSE",
          amount: 9900,
          date: previousMonthDate,
          payee: "Old Utility"
        }
      ]
    });

    const dashboard = await getDashboardData();

    expect(dashboard.summary).toEqual({
      income: 300000,
      expenses: 120000,
      net: 180000,
      count: 2
    });
    expect(dashboard.spendByCategory).toEqual([
      expect.objectContaining({ name: "Rent", amount: 120000, count: 1 })
    ]);
    expect(dashboard.recentTransactions.map((transaction) => transaction.payee)).toEqual([
      "Landlord",
      "Northstar Studio",
      "Old Utility"
    ]);
    expect(dashboard.monthlyChart).toHaveLength(4);
    expect(dashboard.hasTransactions).toBe(true);
  });

  it("keeps seedDemoData idempotent", async () => {
    const firstWorkspace = await seedDemoData(prisma);
    const firstCounts = {
      workspaces: await prisma.workspace.count(),
      categories: await prisma.category.count(),
      transactions: await prisma.transaction.count()
    };

    const secondWorkspace = await seedDemoData(prisma);
    const secondCounts = {
      workspaces: await prisma.workspace.count(),
      categories: await prisma.category.count(),
      transactions: await prisma.transaction.count()
    };

    expect(firstWorkspace.id).not.toBe(secondWorkspace.id);
    expect(firstCounts).toEqual(secondCounts);
    expect(secondCounts).toEqual({ workspaces: 1, categories: 12, transactions: 48 });
  });
});
