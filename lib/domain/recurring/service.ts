import { addDays, startOfDay } from "date-fns";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/client";
import {
  UPCOMING_HORIZON_DAYS,
  type RecurringFrequency,
  type RecurringRuleStatus
} from "@/lib/domain/constants";
import {
  generateOccurrences,
  isRuleEnded,
  nextOccurrenceAtOrAfter
} from "@/lib/domain/recurring/recurrence";
import { getWorkspace } from "@/lib/domain/workspace/service";
import {
  occurrenceEditSchema,
  recurringWriteSchema,
  type OccurrenceEditValues,
  type RecurringFormValues
} from "@/lib/validation/recurring";

export type RecurringRuleWithCategory = Prisma.RecurringRuleGetPayload<{
  include: { category: true; occurrences: true };
}>;

export type EffectiveRuleStatus = RecurringRuleStatus | "ENDED";

function parseIsoDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function toIsoDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Persisted status is only ACTIVE/PAUSED. Callers usually want the effective
 * status (ACTIVE/PAUSED/ENDED) which folds in endDate.
 */
export function getEffectiveStatus(rule: {
  status: string;
  endDate: Date | null;
}, now: Date = new Date()): EffectiveRuleStatus {
  if (rule.status === "PAUSED") return "PAUSED";
  if (isRuleEnded(rule, now)) return "ENDED";
  return "ACTIVE";
}

export async function listRecurringRules() {
  const workspace = await getWorkspace();
  return prisma.recurringRule.findMany({
    where: { workspaceId: workspace.id },
    include: { category: true, occurrences: true },
    orderBy: [{ status: "asc" }, { startDate: "asc" }]
  });
}

export async function getRecurringRule(id: string) {
  const workspace = await getWorkspace();
  return prisma.recurringRule.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { category: true, occurrences: true }
  });
}

async function assertCategory(workspaceId: string, categoryId: string, type: string) {
  return prisma.category.findFirst({
    where: { id: categoryId, workspaceId, type }
  });
}

export async function createRecurringRule(input: RecurringFormValues) {
  const parsed = recurringWriteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const workspace = await getWorkspace();
  const category = await assertCategory(workspace.id, parsed.data.categoryId, parsed.data.type);
  if (!category) {
    return {
      ok: false as const,
      errors: { categoryId: ["Choose a valid category for this recurrence type."] }
    };
  }

  const rule = await prisma.recurringRule.create({
    data: {
      workspaceId: workspace.id,
      categoryId: parsed.data.categoryId,
      type: parsed.data.type,
      amount: parsed.data.amount,
      frequency: parsed.data.frequency,
      startDate: parseIsoDate(parsed.data.startDate),
      endDate: parsed.data.endDate ? parseIsoDate(parsed.data.endDate) : null,
      status: "ACTIVE",
      payee: parsed.data.payee,
      note: parsed.data.note,
      paymentMethod: parsed.data.paymentMethod
    }
  });
  return { ok: true as const, rule };
}

export async function updateRecurringRule(id: string, input: RecurringFormValues) {
  const existing = await getRecurringRule(id);
  if (!existing) {
    return { ok: false as const, errors: { form: ["Recurring rule not found."] } };
  }

  const parsed = recurringWriteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const workspace = await getWorkspace();
  const category = await assertCategory(workspace.id, parsed.data.categoryId, parsed.data.type);
  if (!category) {
    return {
      ok: false as const,
      errors: { categoryId: ["Choose a valid category for this recurrence type."] }
    };
  }

  const nextStart = parseIsoDate(parsed.data.startDate);
  const nextEnd = parsed.data.endDate ? parseIsoDate(parsed.data.endDate) : null;

  const rule = await prisma.$transaction(async (tx) => {
    const updated = await tx.recurringRule.update({
      where: { id },
      data: {
        categoryId: parsed.data.categoryId,
        type: parsed.data.type,
        amount: parsed.data.amount,
        frequency: parsed.data.frequency,
        startDate: nextStart,
        endDate: nextEnd,
        payee: parsed.data.payee,
        note: parsed.data.note,
        paymentMethod: parsed.data.paymentMethod
      }
    });

    // When the frequency or start/end window shifts, previously captured
    // exceptions reference scheduled dates that may no longer align with the
    // new series. Drop them to avoid orphans; users can re-skip/re-edit on the
    // new schedule.
    const scheduleChanged =
      existing.frequency !== parsed.data.frequency ||
      existing.startDate.getTime() !== nextStart.getTime() ||
      (existing.endDate?.getTime() ?? null) !== (nextEnd?.getTime() ?? null);

    if (scheduleChanged && existing.occurrences.length > 0) {
      await tx.recurringOccurrence.deleteMany({ where: { ruleId: id } });
    }

    return updated;
  });

  return { ok: true as const, rule };
}

export async function setRecurringRuleStatus(id: string, status: RecurringRuleStatus) {
  const existing = await getRecurringRule(id);
  if (!existing) return { ok: false as const, error: "Recurring rule not found." };

  const rule = await prisma.recurringRule.update({
    where: { id },
    data: { status }
  });
  return { ok: true as const, rule };
}

export async function deleteRecurringRule(id: string) {
  const existing = await getRecurringRule(id);
  if (!existing) return { ok: false as const, error: "Recurring rule not found." };

  await prisma.recurringRule.delete({ where: { id } });
  return { ok: true as const };
}

export async function skipOccurrence(ruleId: string, scheduledIso: string) {
  const rule = await getRecurringRule(ruleId);
  if (!rule) return { ok: false as const, error: "Recurring rule not found." };
  const scheduledDate = parseIsoDate(scheduledIso);

  await prisma.recurringOccurrence.upsert({
    where: { ruleId_scheduledDate: { ruleId, scheduledDate } },
    create: { ruleId, scheduledDate, status: "SKIPPED" },
    update: {
      status: "SKIPPED",
      overrideAmount: null,
      overrideDate: null,
      overridePayee: null,
      overrideNote: null,
      overridePaymentMethod: null,
      overrideCategoryId: null
    }
  });
  return { ok: true as const };
}

export async function unskipOccurrence(ruleId: string, scheduledIso: string) {
  const scheduledDate = parseIsoDate(scheduledIso);
  const existing = await prisma.recurringOccurrence.findUnique({
    where: { ruleId_scheduledDate: { ruleId, scheduledDate } }
  });
  if (!existing) return { ok: true as const };
  if (existing.status === "SKIPPED") {
    await prisma.recurringOccurrence.delete({ where: { id: existing.id } });
  }
  return { ok: true as const };
}

export async function updateOccurrence(
  ruleId: string,
  scheduledIso: string,
  input: OccurrenceEditValues
) {
  const rule = await getRecurringRule(ruleId);
  if (!rule) return { ok: false as const, errors: { form: ["Recurring rule not found."] } };

  const parsed = occurrenceEditSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const workspace = await getWorkspace();
  const category = await assertCategory(workspace.id, parsed.data.categoryId, rule.type);
  if (!category) {
    return {
      ok: false as const,
      errors: { categoryId: ["Choose a valid category for this recurrence type."] }
    };
  }

  const scheduledDate = parseIsoDate(scheduledIso);
  const overrideDate = parseIsoDate(parsed.data.date);

  await prisma.recurringOccurrence.upsert({
    where: { ruleId_scheduledDate: { ruleId, scheduledDate } },
    create: {
      ruleId,
      scheduledDate,
      status: "MODIFIED",
      overrideAmount: parsed.data.amount,
      overrideDate,
      overridePayee: parsed.data.payee,
      overrideNote: parsed.data.note || null,
      overridePaymentMethod: parsed.data.paymentMethod || null,
      overrideCategoryId: parsed.data.categoryId
    },
    update: {
      status: "MODIFIED",
      overrideAmount: parsed.data.amount,
      overrideDate,
      overridePayee: parsed.data.payee,
      overrideNote: parsed.data.note || null,
      overridePaymentMethod: parsed.data.paymentMethod || null,
      overrideCategoryId: parsed.data.categoryId
    }
  });

  return { ok: true as const };
}

export type UpcomingOccurrence = {
  ruleId: string;
  scheduledDate: Date;
  effectiveDate: Date;
  scheduledIso: string;
  amount: number;
  payee: string;
  note: string | null;
  paymentMethod: string | null;
  type: "INCOME" | "EXPENSE";
  frequency: RecurringFrequency;
  category: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
  isModified: boolean;
};

export type UpcomingCashFlow = {
  horizonDays: number;
  from: Date;
  to: Date;
  income: number;
  expenses: number;
  net: number;
  items: UpcomingOccurrence[];
};

export async function getUpcomingCashFlow(
  horizonDays = UPCOMING_HORIZON_DAYS,
  now: Date = new Date()
): Promise<UpcomingCashFlow> {
  const workspace = await getWorkspace();
  const from = startOfDay(now);
  const to = addDays(from, horizonDays);

  const rules = await prisma.recurringRule.findMany({
    where: { workspaceId: workspace.id, status: "ACTIVE" },
    include: { category: true, occurrences: true }
  });

  const items: UpcomingOccurrence[] = [];
  for (const rule of rules) {
    if (isRuleEnded(rule, now)) continue;
    const recurrence = {
      frequency: rule.frequency as RecurringFrequency,
      startDate: rule.startDate,
      endDate: rule.endDate
    };
    const scheduled = generateOccurrences(recurrence, from, to);
    const overrideByIso = new Map(
      rule.occurrences.map((occurrence) => [toIsoDay(occurrence.scheduledDate), occurrence])
    );

    for (const date of scheduled) {
      const iso = toIsoDay(date);
      const override = overrideByIso.get(iso);
      if (override?.status === "SKIPPED") continue;
      const isModified = override?.status === "MODIFIED";
      const category = isModified && override?.overrideCategoryId
        ? await prisma.category.findUnique({ where: { id: override.overrideCategoryId } })
        : rule.category;
      const effectiveCategory = category ?? rule.category;

      items.push({
        ruleId: rule.id,
        scheduledDate: date,
        effectiveDate: isModified && override?.overrideDate ? override.overrideDate : date,
        scheduledIso: iso,
        amount: isModified && override?.overrideAmount != null ? override.overrideAmount : rule.amount,
        payee: isModified && override?.overridePayee ? override.overridePayee : rule.payee,
        note: isModified && override ? (override.overrideNote ?? rule.note) : rule.note,
        paymentMethod: isModified && override
          ? (override.overridePaymentMethod ?? rule.paymentMethod)
          : rule.paymentMethod,
        type: rule.type as "INCOME" | "EXPENSE",
        frequency: rule.frequency as RecurringFrequency,
        category: {
          id: effectiveCategory.id,
          name: effectiveCategory.name,
          color: effectiveCategory.color,
          icon: effectiveCategory.icon
        },
        isModified
      });
    }
  }

  items.sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());

  const income = items
    .filter((item) => item.type === "INCOME")
    .reduce((sum, item) => sum + item.amount, 0);
  const expenses = items
    .filter((item) => item.type === "EXPENSE")
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    horizonDays,
    from,
    to,
    income,
    expenses,
    net: income - expenses,
    items
  };
}

/**
 * Compute the derived "next occurrence" date for a rule (nearest scheduled date
 * that has not been skipped). Returns null if none upcoming.
 */
export function getNextEffectiveOccurrence(
  rule: {
    status: string;
    frequency: string;
    startDate: Date;
    endDate: Date | null;
    occurrences: Array<{ scheduledDate: Date; status: string }>;
  },
  now: Date = new Date()
): Date | null {
  if (rule.status !== "ACTIVE") return null;
  if (isRuleEnded(rule, now)) return null;
  const skippedIsoDates = new Set(
    rule.occurrences
      .filter((occurrence) => occurrence.status === "SKIPPED")
      .map((occurrence) => toIsoDay(occurrence.scheduledDate))
  );
  let cursor = startOfDay(now);
  for (let guard = 0; guard < 365; guard++) {
    const next = nextOccurrenceAtOrAfter(
      {
        frequency: rule.frequency as RecurringFrequency,
        startDate: rule.startDate,
        endDate: rule.endDate
      },
      cursor
    );
    if (!next) return null;
    if (!skippedIsoDates.has(toIsoDay(next))) return next;
    cursor = addDays(next, 1);
  }
  return null;
}
