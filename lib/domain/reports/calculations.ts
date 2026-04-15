import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";

export type SummaryTransaction = {
  amount: number;
  type: string;
  date: Date;
  payee: string;
  category: {
    id: string;
    name: string;
    color: string;
  };
};

export function calculateSummary(transactions: SummaryTransaction[]) {
  const income = transactions.filter((transaction) => transaction.type === "INCOME").reduce((sum, item) => sum + item.amount, 0);
  const expenses = transactions.filter((transaction) => transaction.type === "EXPENSE").reduce((sum, item) => sum + item.amount, 0);

  return {
    income,
    expenses,
    net: income - expenses,
    count: transactions.length
  };
}

export function categoryBreakdown(transactions: SummaryTransaction[], type = "EXPENSE") {
  const totals = new Map<string, { id: string; name: string; color: string; amount: number; count: number }>();

  for (const transaction of transactions) {
    if (transaction.type !== type) continue;

    const current = totals.get(transaction.category.id) ?? {
      id: transaction.category.id,
      name: transaction.category.name,
      color: transaction.category.color,
      amount: 0,
      count: 0
    };

    current.amount += transaction.amount;
    current.count += 1;
    totals.set(transaction.category.id, current);
  }

  return Array.from(totals.values()).sort((a, b) => b.amount - a.amount);
}

export function largestExpenses(transactions: SummaryTransaction[], limit = 5) {
  return transactions
    .filter((transaction) => transaction.type === "EXPENSE")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export function monthlyIncomeExpense(transactions: SummaryTransaction[], months = 6, now = new Date()) {
  const periods = Array.from({ length: months }, (_, index) => startOfMonth(subMonths(now, months - index - 1)));

  return periods.map((period) => {
    const start = startOfMonth(period);
    const end = endOfMonth(period);
    const periodTransactions = transactions.filter((transaction) => transaction.date >= start && transaction.date <= end);
    const summary = calculateSummary(periodTransactions);

    return {
      month: format(period, "MMM"),
      label: format(period, "MMM yyyy"),
      income: summary.income,
      expenses: summary.expenses,
      net: summary.net
    };
  });
}
