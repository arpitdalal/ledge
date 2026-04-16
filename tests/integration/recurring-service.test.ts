import { addDays, startOfDay } from "date-fns";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/client";
import {
  createRecurringRule,
  deleteRecurringRule,
  editRecurringOccurrence,
  getRecurringRule,
  getUpcomingCashFlow,
  listRecurringRules,
  setRecurringRuleStatus,
  skipRecurringOccurrence,
  unskipRecurringOccurrence,
  updateRecurringRule
} from "@/lib/domain/recurring/service";
import { scheduledDateKey } from "@/lib/domain/recurring/recurrence";

async function seedBase() {
  await prisma.recurringOccurrence.deleteMany();
  await prisma.recurringRule.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.workspace.deleteMany();

  const workspace = await prisma.workspace.create({
    data: { name: "Recurring Test", currency: "CAD", locale: "en-CA" }
  });
  const rent = await prisma.category.create({
    data: {
      workspaceId: workspace.id,
      name: "Rent",
      type: "EXPENSE",
      color: "rose",
      icon: "home",
      isDefault: true
    }
  });
  const salary = await prisma.category.create({
    data: {
      workspaceId: workspace.id,
      name: "Salary",
      type: "INCOME",
      color: "emerald",
      icon: "briefcase",
      isDefault: true
    }
  });
  return { workspace, rent, salary };
}

function todayKey() {
  return scheduledDateKey(startOfDay(new Date()));
}

describe("recurring rule service", () => {
  beforeEach(seedBase);

  it("creates, updates, pauses, resumes, and deletes a rule", async () => {
    const { rent } = await seedBase();

    const created = await createRecurringRule({
      payee: "Harrington Lofts",
      type: "EXPENSE",
      amount: "1850",
      categoryId: rent.id,
      frequency: "MONTHLY",
      startDate: todayKey(),
      endDate: "",
      note: "Monthly rent",
      paymentMethod: "Pre-authorized"
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.rule.amount).toBe(185000);
    expect(created.rule.status).toBe("ACTIVE");

    const updated = await updateRecurringRule(created.rule.id, {
      payee: "Harrington Lofts",
      type: "EXPENSE",
      amount: "1900",
      categoryId: rent.id,
      frequency: "MONTHLY",
      startDate: todayKey(),
      endDate: "",
      note: "Rent increase",
      paymentMethod: "Pre-authorized"
    });
    expect(updated.ok).toBe(true);
    if (updated.ok) expect(updated.rule.amount).toBe(190000);

    const paused = await setRecurringRuleStatus(created.rule.id, "PAUSED");
    expect(paused.ok).toBe(true);
    if (paused.ok) expect(paused.rule.status).toBe("PAUSED");

    const resumed = await setRecurringRuleStatus(created.rule.id, "ACTIVE");
    expect(resumed.ok).toBe(true);
    if (resumed.ok) expect(resumed.rule.status).toBe("ACTIVE");

    const deleted = await deleteRecurringRule(created.rule.id);
    expect(deleted).toEqual({ ok: true });

    const refetch = await getRecurringRule(created.rule.id);
    expect(refetch).toBeNull();
  });

  it("rejects category/type mismatches and bad date ranges", async () => {
    const { salary } = await seedBase();

    const mismatch = await createRecurringRule({
      payee: "Rent",
      type: "EXPENSE",
      amount: "1500",
      categoryId: salary.id,
      frequency: "MONTHLY",
      startDate: "2026-04-02",
      endDate: "",
      note: "",
      paymentMethod: ""
    });
    expect(mismatch).toMatchObject({
      ok: false,
      errors: { categoryId: ["Choose a valid category for this transaction type."] }
    });

    const badRange = await createRecurringRule({
      payee: "Rent",
      type: "EXPENSE",
      amount: "1500",
      categoryId: salary.id,
      frequency: "MONTHLY",
      startDate: "2026-04-02",
      endDate: "2026-03-01",
      note: "",
      paymentMethod: ""
    });
    expect(badRange.ok).toBe(false);
    if (badRange.ok) return;
    expect(badRange.errors.endDate?.[0]).toContain("End date cannot be before start date.");
  });

  it("rejects zero/negative amounts", async () => {
    const { rent } = await seedBase();

    const result = await createRecurringRule({
      payee: "Rent",
      type: "EXPENSE",
      amount: "0",
      categoryId: rent.id,
      frequency: "MONTHLY",
      startDate: "2026-04-02",
      endDate: "",
      note: "",
      paymentMethod: ""
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.amount).toContain("Amount must be greater than 0.");
  });

  it("skips, unskips, and edits a single occurrence without affecting the rest", async () => {
    const { rent } = await seedBase();
    const today = startOfDay(new Date());
    const start = scheduledDateKey(today);

    const created = await createRecurringRule({
      payee: "Rent",
      type: "EXPENSE",
      amount: "1850",
      categoryId: rent.id,
      frequency: "WEEKLY",
      startDate: start,
      endDate: "",
      note: "",
      paymentMethod: ""
    });
    if (!created.ok) throw new Error("setup failed");

    const upcomingBefore = await getUpcomingCashFlow(30, today);
    expect(upcomingBefore.occurrences.length).toBeGreaterThanOrEqual(4);

    const secondSlot = upcomingBefore.occurrences[1];
    const secondKey = scheduledDateKey(secondSlot.scheduledDate);
    const skipped = await skipRecurringOccurrence(created.rule.id, secondKey);
    expect(skipped).toEqual({ ok: true });

    const upcomingAfterSkip = await getUpcomingCashFlow(30, today);
    const keysAfterSkip = upcomingAfterSkip.occurrences.map((occurrence) =>
      scheduledDateKey(occurrence.scheduledDate)
    );
    expect(keysAfterSkip).not.toContain(secondKey);
    expect(upcomingAfterSkip.occurrences.length).toBe(upcomingBefore.occurrences.length - 1);

    const thirdSlot = upcomingBefore.occurrences[2];
    const thirdKey = scheduledDateKey(thirdSlot.scheduledDate);
    const edited = await editRecurringOccurrence(created.rule.id, {
      scheduledDate: thirdKey,
      amount: "2000",
      payee: "Rent (adjusted)",
      date: thirdKey,
      note: "One-off change",
      paymentMethod: ""
    });
    expect(edited.ok).toBe(true);

    const upcomingAfterEdit = await getUpcomingCashFlow(30, today);
    const editedOccurrence = upcomingAfterEdit.occurrences.find(
      (occurrence) => scheduledDateKey(occurrence.scheduledDate) === thirdKey
    );
    expect(editedOccurrence).toMatchObject({
      amount: 200000,
      payee: "Rent (adjusted)",
      status: "EDITED"
    });

    const fourthSlot = upcomingBefore.occurrences[3];
    const fourthOccurrence = upcomingAfterEdit.occurrences.find(
      (occurrence) =>
        scheduledDateKey(occurrence.scheduledDate) === scheduledDateKey(fourthSlot.scheduledDate)
    );
    expect(fourthOccurrence).toMatchObject({
      amount: 185000,
      payee: "Rent",
      status: "UPCOMING"
    });

    const unskipped = await unskipRecurringOccurrence(created.rule.id, secondKey);
    expect(unskipped).toEqual({ ok: true });

    const restored = await getUpcomingCashFlow(30, today);
    const restoredKeys = restored.occurrences.map((occurrence) =>
      scheduledDateKey(occurrence.scheduledDate)
    );
    expect(restoredKeys).toContain(secondKey);
  });

  it("paused rules contribute nothing to upcoming cash flow", async () => {
    const { rent, salary } = await seedBase();
    const today = startOfDay(new Date());
    const start = scheduledDateKey(today);

    const paidRule = await createRecurringRule({
      payee: "Salary",
      type: "INCOME",
      amount: "5000",
      categoryId: salary.id,
      frequency: "BIWEEKLY",
      startDate: start,
      endDate: "",
      note: "",
      paymentMethod: ""
    });
    const expense = await createRecurringRule({
      payee: "Rent",
      type: "EXPENSE",
      amount: "1500",
      categoryId: rent.id,
      frequency: "MONTHLY",
      startDate: start,
      endDate: "",
      note: "",
      paymentMethod: ""
    });
    if (!paidRule.ok || !expense.ok) throw new Error("setup failed");

    const before = await getUpcomingCashFlow(30, today);
    expect(before.summary.income).toBeGreaterThan(0);
    expect(before.summary.expenses).toBeGreaterThan(0);

    await setRecurringRuleStatus(paidRule.rule.id, "PAUSED");
    const after = await getUpcomingCashFlow(30, today);
    expect(after.summary.income).toBe(0);
    expect(after.summary.expenses).toBe(before.summary.expenses);
    expect(after.occurrences.every((occurrence) => occurrence.type === "EXPENSE")).toBe(true);
  });

  it("lists recurring rules with the next occurrence", async () => {
    const { rent } = await seedBase();
    const today = startOfDay(new Date());
    const start = scheduledDateKey(addDays(today, 3));

    const created = await createRecurringRule({
      payee: "Rent",
      type: "EXPENSE",
      amount: "1500",
      categoryId: rent.id,
      frequency: "MONTHLY",
      startDate: start,
      endDate: "",
      note: "",
      paymentMethod: ""
    });
    if (!created.ok) throw new Error("setup failed");

    const rows = await listRecurringRules();
    expect(rows).toHaveLength(1);
    expect(rows[0].rule.id).toBe(created.rule.id);
    expect(rows[0].nextOccurrence).not.toBeNull();
    expect(scheduledDateKey(rows[0].nextOccurrence!.scheduledDate)).toBe(start);
  });
});
