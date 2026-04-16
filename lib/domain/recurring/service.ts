import { addDays, startOfDay } from "date-fns";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/client";
import {
  RECURRING_PREVIEW_COUNT,
  UPCOMING_HORIZON_DAYS,
  type RecurringRuleStatus
} from "@/lib/domain/constants";
import {
  aggregateCashFlow,
  fromScheduledDateKey,
  generateOccurrences,
  nextOccurrenceAfter,
  previewRuleOccurrences,
  scheduledDateKey,
  type GeneratedOccurrence,
  type OccurrenceExceptionInput,
  type RecurrenceRuleInput
} from "@/lib/domain/recurring/recurrence";
import { getWorkspace } from "@/lib/domain/workspace/service";
import {
  occurrenceEditSchema,
  recurringRuleWriteSchema,
  type OccurrenceEditValues,
  type RecurringRuleFormValues
} from "@/lib/validation/recurring";

export type RecurringRuleWithRelations = Prisma.RecurringRuleGetPayload<{
  include: { category: true; occurrences: true };
}>;

export type UpcomingOccurrence = GeneratedOccurrence & {
  rule: {
    id: string;
    payee: string;
    frequency: string;
    status: string;
  };
  category: {
    id: string;
    name: string;
    color: string;
    icon: string;
    type: string;
  };
};

export type UpcomingCashFlow = {
  horizonDays: number;
  horizonStart: Date;
  horizonEnd: Date;
  occurrences: UpcomingOccurrence[];
  summary: ReturnType<typeof aggregateCashFlow>;
  hasActiveRules: boolean;
};

function ruleAsInput(rule: RecurringRuleWithRelations): RecurrenceRuleInput {
  return {
    id: rule.id,
    type: rule.type,
    amount: rule.amount,
    payee: rule.payee,
    note: rule.note,
    paymentMethod: rule.paymentMethod,
    categoryId: rule.categoryId,
    frequency: rule.frequency,
    startDate: rule.startDate,
    endDate: rule.endDate,
    status: rule.status
  };
}

function exceptionsAsInputs(rule: RecurringRuleWithRelations): OccurrenceExceptionInput[] {
  return rule.occurrences.map((occurrence) => ({
    scheduledDate: occurrence.scheduledDate,
    kind: occurrence.kind,
    amount: occurrence.amount,
    payee: occurrence.payee,
    note: occurrence.note,
    paymentMethod: occurrence.paymentMethod,
    date: occurrence.date,
    categoryId: occurrence.categoryId
  }));
}

export async function listRecurringRules() {
  const workspace = await getWorkspace();
  const rules = await prisma.recurringRule.findMany({
    where: { workspaceId: workspace.id },
    include: { category: true, occurrences: true },
    orderBy: [{ status: "asc" }, { payee: "asc" }]
  });

  const now = new Date();

  return rules.map((rule) => {
    const next = nextOccurrenceAfter(ruleAsInput(rule), exceptionsAsInputs(rule), now);
    return {
      rule,
      nextOccurrence: next
    };
  });
}

export async function getRecurringRule(id: string) {
  const workspace = await getWorkspace();
  return prisma.recurringRule.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { category: true, occurrences: true }
  });
}

async function assertCategoryType(
  workspaceId: string,
  categoryId: string,
  type: string
) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, workspaceId, type }
  });
  return category;
}

export async function createRecurringRule(input: RecurringRuleFormValues) {
  const parsed = recurringRuleWriteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const workspace = await getWorkspace();
  const category = await assertCategoryType(workspace.id, parsed.data.categoryId, parsed.data.type);
  if (!category) {
    return {
      ok: false as const,
      errors: { categoryId: ["Choose a valid category for this transaction type."] }
    };
  }

  const rule = await prisma.recurringRule.create({
    data: {
      workspaceId: workspace.id,
      categoryId: parsed.data.categoryId,
      type: parsed.data.type,
      amount: parsed.data.amount,
      payee: parsed.data.payee,
      note: parsed.data.note,
      paymentMethod: parsed.data.paymentMethod,
      frequency: parsed.data.frequency,
      startDate: new Date(`${parsed.data.startDate}T12:00:00`),
      endDate: parsed.data.endDate ? new Date(`${parsed.data.endDate}T12:00:00`) : null,
      status: parsed.data.status
    }
  });

  return { ok: true as const, rule };
}

export async function updateRecurringRule(id: string, input: RecurringRuleFormValues) {
  const existing = await getRecurringRule(id);
  if (!existing) {
    return { ok: false as const, errors: { form: ["Recurring rule not found."] } };
  }

  const parsed = recurringRuleWriteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const workspace = await getWorkspace();
  const category = await assertCategoryType(workspace.id, parsed.data.categoryId, parsed.data.type);
  if (!category) {
    return {
      ok: false as const,
      errors: { categoryId: ["Choose a valid category for this transaction type."] }
    };
  }

  const rule = await prisma.recurringRule.update({
    where: { id },
    data: {
      categoryId: parsed.data.categoryId,
      type: parsed.data.type,
      amount: parsed.data.amount,
      payee: parsed.data.payee,
      note: parsed.data.note,
      paymentMethod: parsed.data.paymentMethod,
      frequency: parsed.data.frequency,
      startDate: new Date(`${parsed.data.startDate}T12:00:00`),
      endDate: parsed.data.endDate ? new Date(`${parsed.data.endDate}T12:00:00`) : null,
      status: parsed.data.status
    }
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

export async function skipRecurringOccurrence(ruleId: string, scheduledDateInput: string) {
  const existing = await getRecurringRule(ruleId);
  if (!existing) return { ok: false as const, error: "Recurring rule not found." };

  const scheduledDate = fromScheduledDateKey(scheduledDateInput);
  await prisma.recurringOccurrence.upsert({
    where: { ruleId_scheduledDate: { ruleId, scheduledDate } },
    update: {
      kind: "SKIPPED",
      amount: null,
      payee: null,
      note: null,
      paymentMethod: null,
      date: null,
      categoryId: null
    },
    create: { ruleId, scheduledDate, kind: "SKIPPED" }
  });

  return { ok: true as const };
}

export async function unskipRecurringOccurrence(ruleId: string, scheduledDateInput: string) {
  const existing = await getRecurringRule(ruleId);
  if (!existing) return { ok: false as const, error: "Recurring rule not found." };

  const scheduledDate = fromScheduledDateKey(scheduledDateInput);
  await prisma.recurringOccurrence.deleteMany({
    where: { ruleId, scheduledDate }
  });

  return { ok: true as const };
}

export async function editRecurringOccurrence(ruleId: string, input: OccurrenceEditValues) {
  const existing = await getRecurringRule(ruleId);
  if (!existing) return { ok: false as const, errors: { form: ["Recurring rule not found."] } };

  const parsed = occurrenceEditSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const scheduledDate = fromScheduledDateKey(parsed.data.scheduledDate);
  const actualDate = fromScheduledDateKey(parsed.data.date);

  const occurrence = await prisma.recurringOccurrence.upsert({
    where: { ruleId_scheduledDate: { ruleId, scheduledDate } },
    update: {
      kind: "EDITED",
      amount: parsed.data.amount,
      payee: parsed.data.payee,
      date: actualDate,
      note: parsed.data.note ? parsed.data.note : null,
      paymentMethod: parsed.data.paymentMethod ? parsed.data.paymentMethod : null,
      categoryId: null
    },
    create: {
      ruleId,
      scheduledDate,
      kind: "EDITED",
      amount: parsed.data.amount,
      payee: parsed.data.payee,
      date: actualDate,
      note: parsed.data.note ? parsed.data.note : null,
      paymentMethod: parsed.data.paymentMethod ? parsed.data.paymentMethod : null
    }
  });

  return { ok: true as const, occurrence };
}

export async function getUpcomingCashFlow(
  horizonDays: number = UPCOMING_HORIZON_DAYS,
  now: Date = new Date()
): Promise<UpcomingCashFlow> {
  const workspace = await getWorkspace();
  const horizonStart = startOfDay(now);
  const horizonEnd = addDays(horizonStart, horizonDays);

  const rules = await prisma.recurringRule.findMany({
    where: { workspaceId: workspace.id, status: "ACTIVE" },
    include: { category: true, occurrences: true }
  });

  const occurrences: UpcomingOccurrence[] = [];
  for (const rule of rules) {
    const generated = generateOccurrences(
      ruleAsInput(rule),
      exceptionsAsInputs(rule),
      horizonStart,
      horizonEnd
    );
    for (const occurrence of generated) {
      occurrences.push({
        ...occurrence,
        rule: {
          id: rule.id,
          payee: rule.payee,
          frequency: rule.frequency,
          status: rule.status
        },
        category: {
          id: rule.category.id,
          name: rule.category.name,
          color: rule.category.color,
          icon: rule.category.icon,
          type: rule.category.type
        }
      });
    }
  }

  occurrences.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    horizonDays,
    horizonStart,
    horizonEnd,
    occurrences,
    summary: aggregateCashFlow(occurrences),
    hasActiveRules: rules.length > 0
  };
}

export function previewOccurrencesForRuleInput(
  rule: RecurrenceRuleInput,
  count: number = RECURRING_PREVIEW_COUNT
) {
  return previewRuleOccurrences(rule, count);
}

export { scheduledDateKey };
