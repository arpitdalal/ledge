import { describe, expect, it } from "vitest";

import { calculateSummary, categoryBreakdown, largestExpenses, monthlyIncomeExpense } from "@/lib/domain/reports/calculations";

const rows = [
  {
    amount: 400000,
    type: "INCOME",
    date: new Date("2026-04-01T12:00:00"),
    payee: "Northstar",
    category: { id: "salary", name: "Salary", color: "emerald" }
  },
  {
    amount: 180000,
    type: "EXPENSE",
    date: new Date("2026-04-02T12:00:00"),
    payee: "Rent",
    category: { id: "rent", name: "Rent", color: "rose" }
  },
  {
    amount: 12500,
    type: "EXPENSE",
    date: new Date("2026-04-05T12:00:00"),
    payee: "Grocer",
    category: { id: "groceries", name: "Groceries", color: "emerald" }
  }
];

describe("monthly summary calculations", () => {
  it("calculates totals and net cash flow", () => {
    expect(calculateSummary(rows)).toEqual({
      income: 400000,
      expenses: 192500,
      net: 207500,
      count: 3
    });
  });

  it("builds category breakdown and largest expenses", () => {
    expect(categoryBreakdown(rows)[0]).toMatchObject({ name: "Rent", amount: 180000 });
    expect(largestExpenses(rows, 1)[0].payee).toBe("Rent");
  });

  it("can break down income categories separately", () => {
    expect(categoryBreakdown(rows, "INCOME")).toEqual([
      expect.objectContaining({ id: "salary", name: "Salary", amount: 400000, count: 1 })
    ]);
  });

  it("returns no largest expenses when only income exists", () => {
    expect(largestExpenses(rows.filter((transaction) => transaction.type === "INCOME"))).toEqual([]);
  });

  it("fills recent months with zero totals when no transactions exist", () => {
    const chart = monthlyIncomeExpense(rows, 2, new Date("2026-04-15T12:00:00"));
    expect(chart).toEqual([
      { month: "Mar", label: "Mar 2026", income: 0, expenses: 0, net: 0 },
      { month: "Apr", label: "Apr 2026", income: 400000, expenses: 192500, net: 207500 }
    ]);
  });
});
