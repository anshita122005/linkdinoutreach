"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, DatabaseZap, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { getHealthStatus } from "@/lib/api-client";

export default function Home() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["health"],
    queryFn: getHealthStatus,
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return (
      <EmptyState
        title="Backend unavailable"
        description="Start the local API service and verify the health endpoint before continuing."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          System overview
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Your foundation is live and monitored.
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              API health
            </CardTitle>
            <CardDescription>
              The frontend is successfully hitting the versioned backend health endpoint.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/40">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {data.data.status.toUpperCase()}
              </p>
              <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-400/80">
                Service: {data.data.service}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Database</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{data.data.database}</p>
              </div>
              <DatabaseZap className="h-5 w-5 text-slate-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Ready for extension
            </CardTitle>
            <CardDescription>
              This shell is intentionally modular so future product features fit cleanly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Monorepo structure</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Frontend and backend are independently deployable.</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Validation in place</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Environment checks and API contracts are already wired.</p>
            </div>
            <Button className="w-full">Review architecture</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
