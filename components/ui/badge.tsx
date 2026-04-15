import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]",
      secondary: "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]",
      income: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      expense: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
      outline: "border border-[hsl(var(--border))] text-[hsl(var(--foreground))]"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
