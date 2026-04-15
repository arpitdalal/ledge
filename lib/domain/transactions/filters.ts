import { endOfMonth, startOfMonth } from "date-fns";

import type { TransactionType } from "@/lib/domain/constants";

export type TransactionSort = "newest" | "oldest" | "amount-desc" | "amount-asc";

export type TransactionFilterInput = {
  search?: string;
  month?: number;
  year?: number;
  type?: TransactionType | "ALL";
  categoryId?: string;
  sort?: TransactionSort;
};

export type FilterableTransaction = {
  amount: number;
  date: Date;
  type: string;
  categoryId: string;
  payee: string;
  note: string | null;
  category?: {
    name: string;
  } | null;
};

export function getMonthRange(year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1, 1));
  return {
    gte: start,
    lte: endOfMonth(start)
  };
}

export function filterTransactions<T extends FilterableTransaction>(
  transactions: T[],
  filters: TransactionFilterInput
) {
  const query = filters.search?.trim().toLowerCase();

  return transactions
    .filter((transaction) => {
      if (filters.type && filters.type !== "ALL" && transaction.type !== filters.type) return false;
      if (filters.categoryId && transaction.categoryId !== filters.categoryId) return false;

      if (filters.year && transaction.date.getFullYear() !== filters.year) return false;
      if (filters.month && transaction.date.getMonth() + 1 !== filters.month) return false;

      if (!query) return true;

      return [transaction.payee, transaction.note, transaction.category?.name]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    })
    .sort((a, b) => {
      switch (filters.sort ?? "newest") {
        case "oldest":
          return a.date.getTime() - b.date.getTime();
        case "amount-desc":
          return b.amount - a.amount;
        case "amount-asc":
          return a.amount - b.amount;
        case "newest":
        default:
          return b.date.getTime() - a.date.getTime();
      }
    });
}
