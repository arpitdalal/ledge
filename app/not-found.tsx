import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Page not found</h1>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">The Ledge page you requested does not exist.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
