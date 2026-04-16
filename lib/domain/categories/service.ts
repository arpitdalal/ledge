import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/client";
import { getWorkspace } from "@/lib/domain/workspace/service";
import { categoryFormSchema, type CategoryFormValues } from "@/lib/validation/category";

export type CategoryWithCount = Prisma.CategoryGetPayload<{
  include: { _count: { select: { transactions: true; recurringRules: true } } };
}>;

export async function listCategories() {
  const workspace = await getWorkspace();
  return prisma.category.findMany({
    where: { workspaceId: workspace.id },
    include: { _count: { select: { transactions: true, recurringRules: true } } },
    orderBy: [{ type: "asc" }, { isDefault: "desc" }, { name: "asc" }]
  });
}

export async function createCategory(input: CategoryFormValues) {
  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const workspace = await getWorkspace();

  try {
    const category = await prisma.category.create({
      data: {
        ...parsed.data,
        isDefault: false,
        workspaceId: workspace.id
      }
    });

    return { ok: true as const, category };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false as const, errors: { name: ["A category with this name and type already exists."] } };
    }
    throw error;
  }
}

export async function updateCategory(id: string, input: CategoryFormValues) {
  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const workspace = await getWorkspace();
  const existing = await prisma.category.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { _count: { select: { transactions: true } } }
  });

  if (!existing) return { ok: false as const, errors: { form: ["Category not found."] } };
  if (existing.isDefault) {
    return { ok: false as const, errors: { form: ["Default categories cannot be edited. Create a custom category instead."] } };
  }
  if (existing._count.transactions > 0 && existing.type !== parsed.data.type) {
    return { ok: false as const, errors: { type: ["Category type cannot change while transactions use it."] } };
  }

  try {
    const category = await prisma.category.update({
      where: { id },
      data: parsed.data
    });

    return { ok: true as const, category };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false as const, errors: { name: ["A category with this name and type already exists."] } };
    }
    throw error;
  }
}

export async function deleteCategory(id: string) {
  const workspace = await getWorkspace();
  const category = await prisma.category.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { _count: { select: { transactions: true, recurringRules: true } } }
  });

  if (!category) return { ok: false as const, error: "Category not found." };
  if (category.isDefault) return { ok: false as const, error: "Default categories are part of the demo baseline." };
  if (category._count.transactions > 0) {
    return { ok: false as const, error: "This category has transactions. Reassign or delete those transactions first." };
  }
  if (category._count.recurringRules > 0) {
    return {
      ok: false as const,
      error: "This category is used by recurring rules. Update or delete those rules first."
    };
  }

  await prisma.category.delete({ where: { id } });
  return { ok: true as const };
}
