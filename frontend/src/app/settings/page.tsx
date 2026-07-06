import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          Preferences
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Configure your operating environment
        </h2>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Platform defaults</CardTitle>
          <CardDescription>
            These settings will be extended in later phases as the feature set grows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
          <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800">
            <p className="font-medium text-slate-900 dark:text-slate-100">Backend connectivity</p>
            <p className="mt-1">The frontend is already wired to the health endpoint for local development.</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800">
            <p className="font-medium text-slate-900 dark:text-slate-100">Theme preferences</p>
            <p className="mt-1">Dark mode and system preference support are fully enabled.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
