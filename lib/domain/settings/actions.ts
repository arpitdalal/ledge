"use server";

import { revalidatePath } from "next/cache";

import { resetDemoWorkspace, updateSettings } from "@/lib/domain/settings/service";
import type { SettingsFormValues } from "@/lib/validation/settings";

export async function updateSettingsAction(input: SettingsFormValues) {
  const result = await updateSettings(input);
  if (result.ok) {
    revalidatePath("/");
  }
  return result;
}

export async function resetDemoWorkspaceAction() {
  const result = await resetDemoWorkspace();
  revalidatePath("/");
  return result;
}
