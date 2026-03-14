'use client';

import { ThemeToggle } from '@/shared/components/ThemeToggle';

export function DashboardHeader() {
  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* TODO: Replace with official Howard University logo SVG once assets provided */}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold tracking-wide text-primary-foreground">
              HU
            </span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              OUS Analytics
            </h1>
            <p className="text-sm text-muted-foreground">
              Howard University OUS Office
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
