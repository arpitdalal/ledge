import { Card, CardContent } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="h-28 animate-pulse bg-[hsl(var(--muted)/0.45)]" />
        </Card>
      ))}
    </div>
  );
}
