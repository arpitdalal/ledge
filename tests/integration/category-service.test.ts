import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/client";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory
} from "@/lib/domain/categories/service";

async function seedBase() {
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.workspace.deleteMany();

  const workspace = await prisma.workspace.create({
    data: { name: "Categories", currency: "CAD", locale: "en-CA" }
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

describe("category service boundary", () => {
  beforeEach(seedBase);

  it("creates, lists, updates, and deletes custom categories", async () => {
    const created = await createCategory({
      name: "  Coffee  ",
      type: "EXPENSE",
      color: "amber",
      icon: "utensils"
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.category).toMatchObject({
      name: "Coffee",
      type: "EXPENSE",
      color: "amber",
      icon: "utensils",
      isDefault: false
    });

    const categories = await listCategories();
    expect(categories.find((category) => category.id === created.category.id)?._count.transactions).toBe(0);

    const updated = await updateCategory(created.category.id, {
      name: "Cafe",
      type: "EXPENSE",
      color: "rose",
      icon: "ticket"
    });

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.category).toMatchObject({ name: "Cafe", color: "rose", icon: "ticket" });

    await expect(deleteCategory(created.category.id)).resolves.toEqual({ ok: true });
    await expect(prisma.category.findUnique({ where: { id: created.category.id } })).resolves.toBeNull();
  });

  it("rejects invalid, duplicate, and missing categories", async () => {
    const invalid = await createCategory({
      name: "",
      type: "EXPENSE",
      color: "amber",
      icon: "utensils"
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.errors.name?.[0]).toBe("Enter a category name.");

    const duplicate = await createCategory({
      name: "Groceries",
      type: "EXPENSE",
      color: "amber",
      icon: "utensils"
    });
    expect(duplicate).toEqual({
      ok: false,
      errors: { name: ["A category with this name and type already exists."] }
    });

    await expect(updateCategory("missing", {
      name: "Missing",
      type: "EXPENSE",
      color: "amber",
      icon: "utensils"
    })).resolves.toEqual({ ok: false, errors: { form: ["Category not found."] } });

    await expect(deleteCategory("missing")).resolves.toEqual({
      ok: false,
      error: "Category not found."
    });
  });

  it("protects default and in-use categories", async () => {
    const { expense } = await seedBase();
    const custom = await createCategory({
      name: "Coffee",
      type: "EXPENSE",
      color: "amber",
      icon: "utensils"
    });
    expect(custom.ok).toBe(true);
    if (!custom.ok) return;

    await prisma.transaction.create({
      data: {
        workspaceId: expense.workspaceId,
        categoryId: custom.category.id,
        type: "EXPENSE",
        amount: 550,
        date: new Date("2026-04-15T12:00:00"),
        payee: "Pilot"
      }
    });

    await expect(updateCategory(expense.id, {
      name: "Groceries Plus",
      type: "EXPENSE",
      color: "emerald",
      icon: "cart"
    })).resolves.toEqual({
      ok: false,
      errors: { form: ["Default categories cannot be edited. Create a custom category instead."] }
    });

    await expect(deleteCategory(expense.id)).resolves.toEqual({
      ok: false,
      error: "Default categories are part of the demo baseline."
    });

    await expect(updateCategory(custom.category.id, {
      name: "Consulting",
      type: "INCOME",
      color: "sky",
      icon: "laptop"
    })).resolves.toEqual({
      ok: false,
      errors: { type: ["Category type cannot change while transactions use it."] }
    });

    await expect(deleteCategory(custom.category.id)).resolves.toEqual({
      ok: false,
      error: "This category has transactions. Reassign or delete those transactions first."
    });
  });
});
