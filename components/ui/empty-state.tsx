import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-2 max-w-md text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
