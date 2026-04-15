import { SettingsForm } from "@/components/settings/settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspace } from "@/lib/domain/workspace/service";
import type { SettingsFormValues } from "@/lib/validation/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const workspace = await getWorkspace();

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Settings</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Local workspace preferences and demo reset controls.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>These settings are stored in SQLite with the demo data.</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            initialValues={{
              name: workspace.name,
              currency: workspace.currency as SettingsFormValues["currency"],
              locale: workspace.locale
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
