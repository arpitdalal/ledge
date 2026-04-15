"use server";

import { revalidatePath } from "next/cache";

import { createTransaction, deleteTransaction, updateTransaction } from "@/lib/domain/transactions/service";
import type { TransactionFormValues } from "@/lib/validation/transaction";

export async function createTransactionAction(input: TransactionFormValues) {
  const result = await createTransaction(input);
  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/reports");
  }
  return result;
}

export async function updateTransactionAction(id: string, input: TransactionFormValues) {
  const result = await updateTransaction(id, input);
  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/reports");
    revalidatePath(`/transactions/${id}/edit`);
  }
  return result;
}

export async function deleteTransactionAction(id: string) {
  const result = await deleteTransaction(id);
  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/reports");
  }
  return result;
}

export async function deleteTransactionFormAction(id: string) {
  await deleteTransactionAction(id);
}
