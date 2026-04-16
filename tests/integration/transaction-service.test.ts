import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/client";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction
} from "@/lib/domain/transactions/service";
import { transactionFormSchema } from "@/lib/validation/transaction";

async function seedBase() {
  await prisma.recurringOccurrence.deleteMany();
  await prisma.recurringRule.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.workspace.deleteMany();

  const workspace = await prisma.workspace.create({
    data: { name: "Test", currency: "CAD", locale: "en-CA" }
  });
  const expense = await prisma.category.create({
    data: {
      workspaceId: workspace.id,
      name: "Groceries",
      type: "EXPENSE",
      color: "emerald",
      icon: "cart",
      isDefault: true
    }
  });
  const income = await prisma.category.create({
    data: {
      workspaceId: workspace.id,
      name: "Salary",
      type: "INCOME",
      color: "emerald",
      icon: "briefcase",
      isDefault: true
    }
  });

  return { workspace, expense, income };
}

describe("transaction service boundary", () => {
  beforeEach(seedBase);

  it("validates transaction input", () => {
    const parsed = transactionFormSchema.safeParse({
      amount: "0",
      type: "EXPENSE",
      date: "2026-04-15",
      categoryId: "category",
      payee: ""
    });

    expect(parsed.success).toBe(false);
  });

  it("creates and updates a transaction", async () => {
    const { expense } = await seedBase();

    const created = await createTransaction({
      amount: "42.50",
      type: "EXPENSE",
      date: "2026-04-15",
      categoryId: expense.id,
      payee: "Farm Boy",
      note: "",
      paymentMethod: "Credit card"
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.transaction.amount).toBe(4250);

    const updated = await updateTransaction(created.transaction.id, {
      amount: "51.25",
      type: "EXPENSE",
      date: "2026-04-16",
      categoryId: expense.id,
      payee: "No Frills",
      note: "Weekly shop",
      paymentMethod: "Debit"
    });

    expect(updated.ok).toBe(true);
    const stored = await getTransaction(created.transaction.id);
    expect(stored?.amount).toBe(5125);
    expect(stored?.payee).toBe("No Frills");
  });

  it("rejects category/type mismatches and missing records", async () => {
    const { expense, income } = await seedBase();

    const invalidCategory = await createTransaction({
      amount: "42.50",
      type: "EXPENSE",
      date: "2026-04-15",
      categoryId: income.id,
      payee: "Farm Boy",
      note: "",
      paymentMethod: "Credit card"
    });

    expect(invalidCategory).toEqual({
      ok: false,
      errors: { categoryId: ["Choose a valid category for this transaction type."] }
    });

    const missingUpdate = await updateTransaction("missing", {
      amount: "42.50",
      type: "EXPENSE",
      date: "2026-04-15",
      categoryId: expense.id,
      payee: "Farm Boy",
      note: "",
      paymentMethod: "Credit card"
    });
    const missingDelete = await deleteTransaction("missing");

    expect(missingUpdate).toEqual({ ok: false, errors: { form: ["Transaction not found."] } });
    expect(missingDelete).toEqual({ ok: false, error: "Transaction not found." });
  });

  it("lists transactions by filters and deletes existing rows", async () => {
    const { expense, income } = await seedBase();

    const created = await Promise.all([
      createTransaction({
        amount: "42.50",
        type: "EXPENSE",
        date: "2026-04-15",
        categoryId: expense.id,
        payee: "Farm Boy",
        note: "Weekly groceries",
        paymentMethod: "Credit card"
      }),
      createTransaction({
        amount: "18.75",
        type: "EXPENSE",
        date: "2026-04-16",
        categoryId: expense.id,
        payee: "No Frills",
        note: "Pantry",
        paymentMethod: "Debit"
      }),
      createTransaction({
        amount: "1000",
        type: "INCOME",
        date: "2026-03-28",
        categoryId: income.id,
        payee: "Northstar Studio",
        note: "Payroll",
        paymentMethod: "Bank transfer"
      })
    ]);

    expect(created.every((result) => result.ok)).toBe(true);

    const aprilGroceries = await listTransactions({
      type: "EXPENSE",
      categoryId: expense.id,
      year: 2026,
      month: 4,
      search: "pantry",
      sort: "amount-desc"
    });

    expect(aprilGroceries.map((transaction) => transaction.payee)).toEqual(["No Frills"]);

    const yearIncome = await listTransactions({ type: "INCOME", year: 2026 });
    expect(yearIncome).toHaveLength(1);
    expect(yearIncome[0].payee).toBe("Northstar Studio");

    if (!created[0].ok) return;
    await expect(deleteTransaction(created[0].transaction.id)).resolves.toEqual({ ok: true });
    await expect(getTransaction(created[0].transaction.id)).resolves.toBeNull();
  });
});
