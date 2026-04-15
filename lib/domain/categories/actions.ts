"use server";

import { revalidatePath } from "next/cache";

import { createCategory, deleteCategory, updateCategory } from "@/lib/domain/categories/service";
import type { CategoryFormValues } from "@/lib/validation/category";

export async function createCategoryAction(input: CategoryFormValues) {
  const result = await createCategory(input);
  if (result.ok) {
    revalidatePath("/categories");
    revalidatePath("/transactions");
  }
  return result;
}

export async function updateCategoryAction(id: string, input: CategoryFormValues) {
  const result = await updateCategory(id, input);
  if (result.ok) {
    revalidatePath("/categories");
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
  }
  return result;
}

export async function deleteCategoryAction(id: string) {
  const result = await deleteCategory(id);
  if (result.ok) {
    revalidatePath("/categories");
    revalidatePath("/transactions");
  }
  return result;
}
