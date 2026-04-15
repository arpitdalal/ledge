"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Try again, or reseed the local database from Settings.</p>
        </div>
        <Button onClick={reset}>Retry</Button>
      </CardContent>
    </Card>
  );
}
