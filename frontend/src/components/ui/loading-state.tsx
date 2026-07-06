import { Loader2 } from "lucide-react";

export function LoadingState() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600 dark:text-slate-200" />
        <p className="text-sm text-slate-600 dark:text-slate-300">Loading your foundation status…</p>
      </div>
    </div>
  );
}
