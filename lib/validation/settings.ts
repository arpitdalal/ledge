import { z } from "zod";

import { CURRENCY_CODES } from "@/lib/domain/constants";

export const settingsFormSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required.").max(60, "Keep name under 60 characters."),
  currency: z.enum(CURRENCY_CODES, { error: "Choose a supported currency." }),
  locale: z.string().trim().min(2, "Locale is required.").max(20, "Locale is too long.")
});

export type SettingsFormValues = z.input<typeof settingsFormSchema>;
