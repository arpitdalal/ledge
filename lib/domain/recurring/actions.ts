"use server";

import { revalidatePath } from "next/cache";

import type { RecurringRuleStatus } from "@/lib/domain/constants";
import {
  createRecurringRule,
  deleteRecurringRule,
  editRecurringOccurrence,
  setRecurringRuleStatus,
  skipRecurringOccurrence,
  unskipRecurringOccurrence,
  updateRecurringRule
} from "@/lib/domain/recurring/service";
import type { OccurrenceEditValues, RecurringRuleFormValues } from "@/lib/validation/recurring";

function revalidateRecurringSurfaces(ruleId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/recurring");
  if (ruleId) revalidatePath(`/recurring/${ruleId}/edit`);
}

export async function createRecurringRuleAction(input: RecurringRuleFormValues) {
  const result = await createRecurringRule(input);
  if (result.ok) revalidateRecurringSurfaces();
  return result;
}

export async function updateRecurringRuleAction(id: string, input: RecurringRuleFormValues) {
  const result = await updateRecurringRule(id, input);
  if (result.ok) revalidateRecurringSurfaces(id);
  return result;
}

export async function deleteRecurringRuleAction(id: string) {
  const result = await deleteRecurringRule(id);
  if (result.ok) revalidateRecurringSurfaces();
  return result;
}

export async function setRecurringRuleStatusAction(id: string, status: RecurringRuleStatus) {
  const result = await setRecurringRuleStatus(id, status);
  if (result.ok) revalidateRecurringSurfaces(id);
  return result;
}

export async function skipRecurringOccurrenceAction(ruleId: string, scheduledDate: string) {
  const result = await skipRecurringOccurrence(ruleId, scheduledDate);
  if (result.ok) revalidateRecurringSurfaces(ruleId);
  return result;
}

export async function unskipRecurringOccurrenceAction(ruleId: string, scheduledDate: string) {
  const result = await unskipRecurringOccurrence(ruleId, scheduledDate);
  if (result.ok) revalidateRecurringSurfaces(ruleId);
  return result;
}

export async function editRecurringOccurrenceAction(ruleId: string, input: OccurrenceEditValues) {
  const result = await editRecurringOccurrence(ruleId, input);
  if (result.ok) revalidateRecurringSurfaces(ruleId);
  return result;
}

export async function toggleRecurringRuleStatusFormAction(id: string, next: RecurringRuleStatus) {
  await setRecurringRuleStatusAction(id, next);
}

export async function deleteRecurringRuleFormAction(id: string) {
  await deleteRecurringRuleAction(id);
}

export async function skipRecurringOccurrenceFormAction(ruleId: string, scheduledDate: string) {
  await skipRecurringOccurrenceAction(ruleId, scheduledDate);
}
