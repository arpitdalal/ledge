import { addDays, subDays } from "date-fns";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/client";
import {
  createRecurringRule,
  deleteRecurringRule,
  getEffectiveStatus,
  getNextEffectiveOccurrence,
  getUpcomingCashFlow,
  listRecurringRules,
  setRecurringRuleStatus,
  skipOccurrence,
  unskipOccurrence,
  updateOccurrence,
  updateRecurringRule
} from "@/lib/domain/recurring/service";

async function seedBase() {
  await prisma.recurringOccurrence.deleteMany();
  await prisma.recurringRule.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.workspace.deleteMany();

  const workspace = await prisma.workspace.create({
    data: { name: "Recurring", currency: "CAD", locale: "en-CA" }
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
  const subscriptions = await prisma.category.create({
    data: {
      workspaceId: workspace.id,
      name: "Subscriptions",
      type: "EXPENSE",
      color: "slate",
      icon: "repeat",
      isDefault: true
    }
  });

  return { workspace, rent, salary, subscriptions };
}

function isoDay(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("recurring service boundary", () => {
  beforeEach(seedBase);

  it("creates, lists, updates, and deletes a recurring rule", async () => {
    const { rent } = await seedBase();

    const created = await createRecurringRule({
      payee: "Harrington Lofts",
      type: "EXPENSE",
      amount: "1850",
      categoryId: rent.id,
      frequency: "MONTHLY",
      startDate: "2026-04-01",
      endDate: "",
      note: "Monthly rent",
      paymentMethod: "Pre-authorized"
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const listed = await listRecurringRules();
    expect(listed).toHaveLength(1);
    expect(listed[0].payee).toBe("Harrington Lofts");
    expect(listed[0].amount).toBe(185000);

    const updated = await updateRecurringRule(created.rule.id, {
      payee: "Harrington Lofts II",
      type: "EXPENSE",
      amount: "1925",
      categoryId: rent.id,
      frequency: "MONTHLY",
      startDate: "2026-04-01",
      endDate: "",
      note: "Updated",
      paymentMethod: "Pre-authorized"
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.rule.amount).toBe(192500);
    expect(updated.rule.payee).toBe("Harrington Lofts II");

    await expect(deleteRecurringRule(created.rule.id)).resolves.toEqual({ ok: true });
    await expect(prisma.recurringRule.findUnique({ where: { id: created.rule.id } })).resolves.toBeNull();
  });

  it("rejects invalid input and mismatched category/type", async () => {
    const { rent, salary } = await seedBase();

    const invalid = await createRecurringRule({
      payee: "",
      type: "EXPENSE",
      amount: "0",
      categoryId: rent.id,
      frequency: "MONTHLY",
      startDate: "",
      endDate: "",
      note: "",
      paymentMethod: ""
    });
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;
    expect(invalid.errors.payee?.[0]).toBe("Enter a name or payee.");

    const mismatched = await createRecurringRule({
      payee: "Payroll",
      type: "INCOME",
      amount: "4650",
      categoryId: rent.id,
      frequency: "MONTHLY",
      startDate: "2026-04-01",
      endDate: "",
      note: "",
      paymentMethod: ""
    });
    expect(mismatched.ok).toBe(false);
    if (mismatched.ok) return;
    expect(mismatched.errors.categoryId?.[0]).toBe("Choose a valid category for this recurrence type.");

    const endBefore = await createRecurringRule({
      payee: "Payroll",
      type: "INCOME",
      amount: "4650",
      categoryId: salary.id,
      frequency: "MONTHLY",
      startDate: "2026-04-01",
      endDate: "2026-03-01",
      note: "",
      paymentMethod: ""
    });
    expect(endBefore.ok).toBe(false);
    if (endBefore.ok) return;
    expect(endBefore.errors.endDate?.[0]).toBe("End date cannot be before start date.");
  });

  it("pauses and resumes a rule", async () => {
    const { rent } = await seedBase();
    const created = await createRecurringRule({
      payee: "Rent",
      type: "EXPENSE",
      amount: "1850",
      categoryId: rent.id,
      frequency: "MONTHLY",
      startDate: "2026-04-01",
      endDate: "",
      note: "",
      paymentMethod: ""
    });
    if (!created.ok) throw new Error("seed failed");

    const paused = await setRecurringRuleStatus(created.rule.id, "PAUSED");
    expect(paused.ok).toBe(true);
    if (!paused.ok) return;
    expect(paused.rule.status).toBe("PAUSED");

    const resumed = await setRecurringRuleStatus(created.rule.id, "ACTIVE");
    expect(resumed.ok).toBe(true);
  });

  it("includes generated upcoming items in cash flow, excluding skipped ones", async () => {
    const { rent, salary } = await seedBase();
    const today = new Date();
    const lastMonth = subDays(today, 30);

    await createRecurringRule({
      payee: "Payroll",
      type: "INCOME",
      amount: "4650",
      categoryId: salary.id,
      frequency: "MONTHLY",
      startDate: isoDay(lastMonth),
      endDate: "",
      note: "",
      paymentMethod: ""
    });
    const expense = await createRecurringRule({
      payee: "Rent",
      type: "EXPENSE",
      amount: "1850",
      categoryId: rent.id,
      frequency: "MONTHLY",
      startDate: isoDay(lastMonth),
      endDate: "",
      note: "",
      paymentMethod: ""
    });
    if (!expense.ok) throw new Error("seed failed");

    const cash = await getUpcomingCashFlow(30, today);
    expect(cash.items.length).toBeGreaterThanOrEqual(2);
    expect(cash.income).toBeGreaterThanOrEqual(465000);
    expect(cash.expenses).toBeGreaterThanOrEqual(185000);

    const expenseItem = cash.items.find((item) => item.type === "EXPENSE");
    if (!expenseItem) throw new Error("expected expense item");

    const skip = await skipOccurrence(expense.rule.id, expenseItem.scheduledIso);
    expect(skip.ok).toBe(true);

    const afterSkip = await getUpcomingCashFlow(30, today);
    const stillHasSameExpense = afterSkip.items.some(
      (item) => item.ruleId === expense.rule.id && item.scheduledIso === expenseItem.scheduledIso
    );
    expect(stillHasSameExpense).toBe(false);
  });

  it("excludes paused rules from upcoming cash flow", async () => {
    const { rent } = await seedBase();
    const created = await createRecurringRule({
      payee: "Rent",
      type: "EXPENSE",
      amount: "1850",
      categoryId: rent.id,
      frequency: "MONTHLY",
      startDate: isoDay(new Date()),
      endDate: "",
      note: "",
      paymentMethod: ""
    });
    if (!created.ok) throw new Error("seed failed");

    const beforePause = await getUpcomingCashFlow(30, new Date());
    expect(beforePause.items.length).toBeGreaterThanOrEqual(1);

    await setRecurringRuleStatus(created.rule.id, "PAUSED");
    const afterPause = await getUpcomingCashFlow(30, new Date());
    expect(afterPause.items.filter((item) => item.ruleId === created.rule.id)).toEqual([]);
  });

  it("edits one occurrence without changing the rule or other occurrences", async () => {
    const { rent, subscriptions } = await seedBase();
    const today = new Date();
    const startIso = isoDay(today);

    const created = await createRecurringRule({
      payee: "Rent",
      type: "EXPENSE",
      amount: "1850",
      categoryId: rent.id,
      frequency: "MONTHLY",
      startDate: startIso,
      endDate: "",
      note: "",
      paymentMethod: ""
    });
    if (!created.ok) throw new Error("seed failed");

    const cash = await getUpcomingCashFlow(60, today);
    const first = cash.items.find((item) => item.ruleId === created.rule.id);
    if (!first) throw new Error("expected first upcoming");

    const edit = await updateOccurrence(created.rule.id, first.scheduledIso, {
      amount: "2100",
      date: first.scheduledIso,
      payee: "Rent (top-up month)",
      note: "Prorated",
      paymentMethod: "Bank transfer",
      categoryId: subscriptions.id
    });
    expect(edit.ok).toBe(true);
    if (!edit.ok) return;

    const afterEdit = await getUpcomingCashFlow(60, today);
    const editedFirst = afterEdit.items.find(
      (item) => item.ruleId === created.rule.id && item.scheduledIso === first.scheduledIso
    );
    expect(editedFirst).toBeDefined();
    expect(editedFirst?.amount).toBe(210000);
    expect(editedFirst?.payee).toBe("Rent (top-up month)");
    expect(editedFirst?.isModified).toBe(true);
    expect(editedFirst?.category.id).toBe(subscriptions.id);

    const latestRule = await prisma.recurringRule.findUniqueOrThrow({
      where: { id: created.rule.id }
    });
    expect(latestRule.amount).toBe(185000);
    expect(latestRule.payee).toBe("Rent");

    const otherFutureOccurrences = afterEdit.items.filter(
      (item) => item.ruleId === created.rule.id && item.scheduledIso !== first.scheduledIso
    );
    for (const item of otherFutureOccurrences) {
      expect(item.amount).toBe(185000);
      expect(item.payee).toBe("Rent");
      expect(item.isModified).toBe(false);
    }
  });

  it("unskip restores a previously skipped occurrence", async () => {
    const { rent } = await seedBase();
    const today = new Date();
    const created = await createRecurringRule({
      payee: "Rent",
      type: "EXPENSE",
      amount: "1850",
      categoryId: rent.id,
      frequency: "MONTHLY",
      startDate: isoDay(today),
      endDate: "",
      note: "",
      paymentMethod: ""
    });
    if (!created.ok) throw new Error("seed failed");

    const cash = await getUpcomingCashFlow(45, today);
    const target = cash.items[0];
    await skipOccurrence(created.rule.id, target.scheduledIso);
    const afterSkip = await getUpcomingCashFlow(45, today);
    expect(afterSkip.items.find((item) => item.scheduledIso === target.scheduledIso)).toBeUndefined();

    const restore = await unskipOccurrence(created.rule.id, target.scheduledIso);
    expect(restore.ok).toBe(true);
    const afterRestore = await getUpcomingCashFlow(45, today);
    expect(afterRestore.items.find((item) => item.scheduledIso === target.scheduledIso)).toBeDefined();
  });

  it("derives effective status and next occurrence correctly", async () => {
    const { rent } = await seedBase();
    const today = new Date();
    const yesterday = subDays(today, 1);

    const active = await createRecurringRule({
      payee: "Rent",
      type: "EXPENSE",
      amount: "1850",
      categoryId: rent.id,
      frequency: "WEEKLY",
      startDate: isoDay(today),
      endDate: "",
      note: "",
      paymentMethod: ""
    });
    if (!active.ok) throw new Error("seed failed");

    const paused = await createRecurringRule({
      payee: "Rent v2",
      type: "EXPENSE",
      amount: "1850",
      categoryId: rent.id,
      frequency: "WEEKLY",
      startDate: isoDay(today),
      endDate: "",
      note: "",
      paymentMethod: ""
    });
    if (!paused.ok) throw new Error("seed failed");
    await setRecurringRuleStatus(paused.rule.id, "PAUSED");

    const ended = await createRecurringRule({
      payee: "Rent v3",
      type: "EXPENSE",
      amount: "1850",
      categoryId: rent.id,
      frequency: "WEEKLY",
      startDate: isoDay(subDays(today, 14)),
      endDate: isoDay(yesterday),
      note: "",
      paymentMethod: ""
    });
    if (!ended.ok) throw new Error("seed failed");

    const rules = await listRecurringRules();
    const byId = new Map(rules.map((rule) => [rule.id, rule]));

    expect(getEffectiveStatus(byId.get(active.rule.id)!, today)).toBe("ACTIVE");
    expect(getEffectiveStatus(byId.get(paused.rule.id)!, today)).toBe("PAUSED");
    expect(getEffectiveStatus(byId.get(ended.rule.id)!, today)).toBe("ENDED");

    const next = getNextEffectiveOccurrence(byId.get(active.rule.id)!, today);
    expect(next).not.toBeNull();
    expect(next!.getTime()).toBeGreaterThanOrEqual(today.getTime() - 86_400_000);

    const pausedNext = getNextEffectiveOccurrence(byId.get(paused.rule.id)!, today);
    expect(pausedNext).toBeNull();

    const endedNext = getNextEffectiveOccurrence(byId.get(ended.rule.id)!, today);
    expect(endedNext).toBeNull();
  });

  it("skips the next effective occurrence correctly when one is marked skipped", async () => {
    const { rent } = await seedBase();
    const today = new Date();
    const created = await createRecurringRule({
      payee: "Rent",
      type: "EXPENSE",
      amount: "1850",
      categoryId: rent.id,
      frequency: "WEEKLY",
      startDate: isoDay(today),
      endDate: "",
      note: "",
      paymentMethod: ""
    });
    if (!created.ok) throw new Error("seed failed");

    const ruleRecord = await prisma.recurringRule.findUniqueOrThrow({
      where: { id: created.rule.id },
      include: { occurrences: true }
    });

    const firstOccurrence = getNextEffectiveOccurrence(ruleRecord, today);
    expect(firstOccurrence).not.toBeNull();

    await skipOccurrence(created.rule.id, isoDay(firstOccurrence!));

    const refreshed = await prisma.recurringRule.findUniqueOrThrow({
      where: { id: created.rule.id },
      include: { occurrences: true }
    });
    const followUp = getNextEffectiveOccurrence(refreshed, today);
    expect(followUp).not.toBeNull();
    expect(isoDay(followUp!)).not.toBe(isoDay(firstOccurrence!));
    expect(followUp!.getTime()).toBe(addDays(firstOccurrence!, 7).getTime());
  });
});
