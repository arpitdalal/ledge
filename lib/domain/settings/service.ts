import { prisma } from "@/lib/db/client";
import { seedDemoData } from "@/lib/db/demo";
import { getWorkspace } from "@/lib/domain/workspace/service";
import { settingsFormSchema, type SettingsFormValues } from "@/lib/validation/settings";

export async function updateSettings(input: SettingsFormValues) {
  const parsed = settingsFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const workspace = await getWorkspace();
  const updated = await prisma.workspace.update({
    where: { id: workspace.id },
    data: parsed.data
  });

  return { ok: true as const, workspace: updated };
}

export async function resetDemoWorkspace() {
  await seedDemoData(prisma);
  return { ok: true as const };
}
