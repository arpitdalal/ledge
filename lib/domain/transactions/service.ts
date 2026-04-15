import { endOfYear, startOfYear } from "date-fns";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/client";
import { getWorkspace } from "@/lib/domain/workspace/service";
import { getMonthRange, type TransactionFilterInput } from "@/lib/domain/transactions/filters";
import { transactionWriteSchema, type TransactionFormValues } from "@/lib/validation/transaction";

export type TransactionWithCategory = Prisma.TransactionGetPayload<{
  include: { category: true };
}>;

export async function listTransactions(filters: TransactionFilterInput = {}) {
  const workspace = await getWorkspace();
  const where: Prisma.TransactionWhereInput = {
    workspaceId: workspace.id
  };

  if (filters.type && filters.type !== "ALL") where.type = filters.type;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.year && filters.month) {
    where.date = getMonthRange(filters.year, filters.month);
  } else if (filters.year) {
    const yearStart = new Date(filters.year, 0, 1);
    where.date = {
      gte: startOfYear(yearStart),
      lte: endOfYear(yearStart)
    };
  }

  if (filters.search?.trim()) {
    const query = filters.search.trim();
    where.OR = [
      { payee: { contains: query } },
      { note: { contains: query } },
      { category: { name: { contains: query } } }
    ];
  }

  const orderBy: Prisma.TransactionOrderByWithRelationInput =
    filters.sort === "oldest"
      ? { date: "asc" }
      : filters.sort === "amount-desc"
        ? { amount: "desc" }
        : filters.sort === "amount-asc"
          ? { amount: "asc" }
          : { date: "desc" };

  return prisma.transaction.findMany({
    where,
    orderBy,
    include: { category: true }
  });
}

export async function getTransaction(id: string) {
  const workspace = await getWorkspace();
  return prisma.transaction.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { category: true }
  });
}

export async function createTransaction(input: TransactionFormValues) {
  const parsed = transactionWriteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const workspace = await getWorkspace();
  const category = await prisma.category.findFirst({
    where: {
      id: parsed.data.categoryId,
      workspaceId: workspace.id,
      type: parsed.data.type
    }
  });

  if (!category) {
    return { ok: false as const, errors: { categoryId: ["Choose a valid category for this transaction type."] } };
  }

  const transaction = await prisma.transaction.create({
    data: {
      workspaceId: workspace.id,
      categoryId: parsed.data.categoryId,
      type: parsed.data.type,
      amount: parsed.data.amount,
      date: new Date(`${parsed.data.date}T12:00:00`),
      payee: parsed.data.payee,
      note: parsed.data.note,
      paymentMethod: parsed.data.paymentMethod
    }
  });

  return { ok: true as const, transaction };
}

export async function updateTransaction(id: string, input: TransactionFormValues) {
  const existing = await getTransaction(id);
  if (!existing) {
    return { ok: false as const, errors: { form: ["Transaction not found."] } };
  }

  const parsed = transactionWriteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const workspace = await getWorkspace();
  const category = await prisma.category.findFirst({
    where: {
      id: parsed.data.categoryId,
      workspaceId: workspace.id,
      type: parsed.data.type
    }
  });

  if (!category) {
    return { ok: false as const, errors: { categoryId: ["Choose a valid category for this transaction type."] } };
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      categoryId: parsed.data.categoryId,
      type: parsed.data.type,
      amount: parsed.data.amount,
      date: new Date(`${parsed.data.date}T12:00:00`),
      payee: parsed.data.payee,
      note: parsed.data.note,
      paymentMethod: parsed.data.paymentMethod
    }
  });

  return { ok: true as const, transaction };
}

export async function deleteTransaction(id: string) {
  const existing = await getTransaction(id);
  if (!existing) return { ok: false as const, error: "Transaction not found." };

  await prisma.transaction.delete({ where: { id } });
  return { ok: true as const };
}
