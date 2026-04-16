"use server";

import { revalidatePath } from "next/cache";

import {
  createRecurringRule,
  deleteRecurringRule,
  setRecurringRuleStatus,
  skipOccurrence,
  unskipOccurrence,
  updateOccurrence,
  updateRecurringRule
} from "@/lib/domain/recurring/service";
import type { RecurringRuleStatus } from "@/lib/domain/constants";
import type { OccurrenceEditValues, RecurringFormValues } from "@/lib/validation/recurring";

function revalidateSurfaces() {
  revalidatePath("/dashboard");
  revalidatePath("/recurring");
  revalidatePath("/transactions");
}

export async function createRecurringRuleAction(input: RecurringFormValues) {
  const result = await createRecurringRule(input);
  if (result.ok) revalidateSurfaces();
  return result;
}

export async function updateRecurringRuleAction(id: string, input: RecurringFormValues) {
  const result = await updateRecurringRule(id, input);
  if (result.ok) {
    revalidateSurfaces();
    revalidatePath(`/recurring/${id}/edit`);
  }
  return result;
}

export async function setRecurringRuleStatusAction(id: string, status: RecurringRuleStatus) {
  const result = await setRecurringRuleStatus(id, status);
  if (result.ok) revalidateSurfaces();
  return result;
}

export async function deleteRecurringRuleAction(id: string) {
  const result = await deleteRecurringRule(id);
  if (result.ok) revalidateSurfaces();
  return result;
}

export async function skipOccurrenceAction(ruleId: string, scheduledIso: string) {
  const result = await skipOccurrence(ruleId, scheduledIso);
  if (result.ok) revalidateSurfaces();
  return result;
}

export async function unskipOccurrenceAction(ruleId: string, scheduledIso: string) {
  const result = await unskipOccurrence(ruleId, scheduledIso);
  if (result.ok) revalidateSurfaces();
  return result;
}

export async function updateOccurrenceAction(
  ruleId: string,
  scheduledIso: string,
  input: OccurrenceEditValues
) {
  const result = await updateOccurrence(ruleId, scheduledIso, input);
  if (result.ok) revalidateSurfaces();
  return result;
}
