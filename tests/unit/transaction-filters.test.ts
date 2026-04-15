import { describe, expect, it } from "vitest";

import { filterTransactions, getMonthRange } from "@/lib/domain/transactions/filters";

const transactions = [
  {
    amount: 5000,
    date: new Date("2026-04-04T12:00:00"),
    type: "EXPENSE",
    categoryId: "groceries",
    payee: "Farm Boy",
    note: null,
    category: { name: "Groceries" }
  },
  {
    amount: 250000,
    date: new Date("2026-04-01T12:00:00"),
    type: "INCOME",
    categoryId: "salary",
    payee: "Northstar Studio",
    note: "Payroll",
    category: { name: "Salary" }
  },
  {
    amount: 8000,
    date: new Date("2026-03-12T12:00:00"),
    type: "EXPENSE",
    categoryId: "dining",
    payee: "Pai",
    note: "Dinner",
    category: { name: "Dining" }
  }
];

describe("transaction filtering", () => {
  it("filters by type, month, year, and search", () => {
    const result = filterTransactions(transactions, {
      type: "EXPENSE",
      month: 4,
      year: 2026,
      search: "farm"
    });

    expect(result).toHaveLength(1);
    expect(result[0].payee).toBe("Farm Boy");
  });

  it("filters by category and searches notes and category names", () => {
    expect(filterTransactions(transactions, { categoryId: "salary", search: "pay" })).toHaveLength(1);
    expect(filterTransactions(transactions, { search: "dining" }).map((transaction) => transaction.payee)).toEqual(["Pai"]);
    expect(filterTransactions(transactions, { type: "ALL" })).toHaveLength(3);
  });

  it("sorts by newest and oldest without mutating the source list", () => {
    const sourceOrder = transactions.map((transaction) => transaction.payee);

    expect(filterTransactions(transactions, { sort: "newest" }).map((transaction) => transaction.payee)).toEqual([
      "Farm Boy",
      "Northstar Studio",
      "Pai"
    ]);
    expect(filterTransactions(transactions, { sort: "oldest" }).map((transaction) => transaction.payee)).toEqual([
      "Pai",
      "Northstar Studio",
      "Farm Boy"
    ]);
    expect(transactions.map((transaction) => transaction.payee)).toEqual(sourceOrder);
  });

  it("sorts by amount ascending", () => {
    const result = filterTransactions(transactions, { sort: "amount-asc" });
    expect(result.map((transaction) => transaction.amount)).toEqual([5000, 8000, 250000]);
  });

  it("sorts by amount descending", () => {
    const result = filterTransactions(transactions, { sort: "amount-desc" });
    expect(result.map((transaction) => transaction.amount)).toEqual([250000, 8000, 5000]);
  });

  it("builds inclusive month ranges", () => {
    const range = getMonthRange(2026, 2);

    expect(range.gte).toEqual(new Date(2026, 1, 1));
    expect(range.lte.getFullYear()).toBe(2026);
    expect(range.lte.getMonth()).toBe(1);
    expect(range.lte.getDate()).toBe(28);
    expect(range.lte.getHours()).toBe(23);
    expect(range.lte.getMinutes()).toBe(59);
  });
});
