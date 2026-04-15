import { z } from "zod";

import { CATEGORY_COLORS, CATEGORY_ICONS, TRANSACTION_TYPES } from "@/lib/domain/constants";

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a category name.").max(36, "Keep name under 36 characters."),
  type: z.enum(TRANSACTION_TYPES, { error: "Choose income or expense." }),
  color: z.enum(CATEGORY_COLORS, { error: "Choose a color." }),
  icon: z.enum(CATEGORY_ICONS, { error: "Choose an icon." })
});

export type CategoryFormValues = z.input<typeof categoryFormSchema>;
