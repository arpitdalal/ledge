import Link from "next/link";
import type { ReactNode } from "react";

import { MainNav } from "@/components/layout/main-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <header className="sticky top-0 z-30 border-b bg-[hsl(var(--background)/0.92)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-[hsl(var(--primary))] text-sm font-bold text-[hsl(var(--primary-foreground))]">
                L
              </span>
              <span>
                <span className="block text-base font-semibold leading-tight">Ledge</span>
                <span className="hidden text-xs text-[hsl(var(--muted-foreground))] sm:block">
                  Personal cash flow tracker
                </span>
              </span>
            </Link>
            <div className="hidden rounded-md border px-3 py-1.5 text-xs text-[hsl(var(--muted-foreground))] sm:block">
              Single local workspace
            </div>
          </div>
          <MainNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
