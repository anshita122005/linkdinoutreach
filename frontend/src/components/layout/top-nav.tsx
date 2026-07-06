"use client";

import { Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function TopNav() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex items-center justify-between border-b border-slate-200/80 bg-white/70 px-6 py-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/60">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Operations workspace</p>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Foundation control center
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="h-4 w-4 hidden dark:block" />
        </Button>
      </div>
    </header>
  );
}
