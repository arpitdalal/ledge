import { describe, expect, it } from "vitest";

import { categoryFormSchema } from "@/lib/validation/category";
import { settingsFormSchema } from "@/lib/validation/settings";
import { transactionFormSchema, transactionWriteSchema } from "@/lib/validation/transaction";

describe("form validation schemas", () => {
  it("normalizes valid transaction input for writes", () => {
    const parsed = transactionWriteSchema.parse({
      amount: "$1,234.56",
      type: "EXPENSE",
      date: "2026-04-15",
      categoryId: "category-id",
      payee: "  Farm Boy  ",
      note: "",
      paymentMethod: ""
    });

    expect(parsed).toEqual({
      amount: 123456,
      type: "EXPENSE",
      date: "2026-04-15",
      categoryId: "category-id",
      payee: "Farm Boy",
      note: null,
      paymentMethod: null
    });
  });

  it("accepts comma-decimal transaction amounts", () => {
    const parsed = transactionWriteSchema.parse({
      amount: "12,34",
      type: "EXPENSE",
      date: "2026-04-15",
      categoryId: "category-id",
      payee: "Grocer",
      note: "",
      paymentMethod: ""
    });

    expect(parsed.amount).toBe(1234);
  });

  it("rejects invalid transaction fields with targeted errors", () => {
    const parsed = transactionFormSchema.safeParse({
      amount: "abc",
      type: "TRANSFER",
      date: "",
      categoryId: "",
      payee: "",
      note: "x".repeat(241),
      paymentMethod: "x".repeat(41)
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const errors = parsed.error.flatten().fieldErrors;
    expect(errors.amount).toContain("Enter a valid amount.");
    expect(errors.amount).toContain("Amount must be greater than 0.");
    expect(errors.type).toEqual(["Choose income or expense."]);
    expect(errors.date).toEqual(["Choose a date."]);
    expect(errors.categoryId).toEqual(["Choose a category."]);
    expect(errors.payee).toEqual(["Enter a payee or merchant."]);
    expect(errors.note).toEqual(["Keep note under 240 characters."]);
    expect(errors.paymentMethod).toEqual(["Keep payment method under 40 characters."]);
  });

  it("validates category names, colors, icons, and types", () => {
    expect(categoryFormSchema.parse({
      name: "  Coffee  ",
      type: "EXPENSE",
      color: "amber",
      icon: "utensils"
    })).toEqual({
      name: "Coffee",
      type: "EXPENSE",
      color: "amber",
      icon: "utensils"
    });

    const parsed = categoryFormSchema.safeParse({
      name: "x".repeat(37),
      type: "TRANSFER",
      color: "blue",
      icon: "coffee"
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const errors = parsed.error.flatten().fieldErrors;
    expect(errors.name).toEqual(["Keep name under 36 characters."]);
    expect(errors.type).toEqual(["Choose income or expense."]);
    expect(errors.color).toEqual(["Choose a color."]);
    expect(errors.icon).toEqual(["Choose an icon."]);
  });

  it("validates workspace settings", () => {
    expect(settingsFormSchema.parse({
      name: "  Household  ",
      currency: "USD",
      locale: "en-US"
    })).toEqual({
      name: "Household",
      currency: "USD",
      locale: "en-US"
    });

    const parsed = settingsFormSchema.safeParse({
      name: "",
      currency: "AUD",
      locale: "x".repeat(21)
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const errors = parsed.error.flatten().fieldErrors;
    expect(errors.name).toEqual(["Workspace name is required."]);
    expect(errors.currency).toEqual(["Choose a supported currency."]);
    expect(errors.locale).toEqual(["Locale is too long."]);
  });
});
