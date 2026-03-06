'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import type { SchoolInsightItem } from '@/lib/api/types';

interface SchoolsBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSchools: number;
  schoolInsights: SchoolInsightItem[];
  dateLabel: string;
}

export function SchoolsBreakdownModal({
  open,
  onOpenChange,
  activeSchools,
  schoolInsights,
  dateLabel,
}: SchoolsBreakdownModalProps) {
  const orderedSchools = [...schoolInsights].sort((a, b) => {
    if (b.total !== a.total) {
      return b.total - a.total;
    }
    return a.school.localeCompare(b.school);
  });
  const undergradTotal = orderedSchools.reduce(
    (sum, item) => sum + item.total,
    0
  );
  const largestSchoolCount = orderedSchools[0]?.total ?? 0;
  const largestSchoolSharePct =
    undergradTotal > 0 ? (largestSchoolCount / undergradTotal) * 100 : 0;
  const topThreeSharePct = summarizeTopShare(orderedSchools, 3, undergradTotal);
  const topSchools = orderedSchools.slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Schools/Colleges Breakdown</DialogTitle>
          <DialogDescription>
            Undergraduate school and college distribution for the selected data
            date.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-3">
          <SummaryTile
            label="Schools/colleges"
            value={activeSchools.toLocaleString()}
          />
          <SummaryTile
            label="Largest school share"
            value={formatPercent(largestSchoolSharePct)}
          />
          <SummaryTile
            label="Top 3 combined share"
            value={formatPercent(topThreeSharePct)}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {topSchools.length === 0 ? (
            <div className="rounded-lg border border-border/60 bg-secondary/60 px-4 py-3 text-sm text-muted-foreground md:col-span-3">
              No school-level insight data is available.
            </div>
          ) : (
            topSchools.map((item) => (
              <div
                key={item.school}
                className="h-full rounded-lg border border-border/60 bg-secondary/60 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {item.school}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPercent(item.shareOfUndergradPct)} of undergrad
                      total
                    </p>
                  </div>
                  <p className="text-right">
                    <span className="block text-lg font-bold text-foreground">
                      {item.total.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      students
                    </span>
                  </p>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="rounded-md bg-background/70 px-2 py-1">
                    Active majors: {item.activeMajorsCount.toLocaleString()}
                  </div>
                  <div className="rounded-md bg-background/70 px-2 py-1">
                    Intl share: {formatPercent(item.internationalPct)}
                  </div>
                </div>
                <div className="mt-2 rounded-md bg-background/70 px-2 py-1 text-xs text-muted-foreground">
                  Top major: {item.topMajors[0]?.label ?? 'N/A'}
                </div>
              </div>
            ))
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Showing the top {Math.min(topSchools.length, 6)} schools by
          undergraduate volume. Counts reflect selected Data Date: {dateLabel}
        </p>
      </DialogContent>
    </Dialog>
  );
}

interface SummaryTileProps {
  label: string;
  value: string;
}

function SummaryTile({ label, value }: SummaryTileProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/60 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function summarizeTopShare(
  schools: SchoolInsightItem[],
  topN: number,
  total: number
): number {
  if (total <= 0) {
    return 0;
  }
  const numerator = schools
    .slice(0, topN)
    .reduce((sum, item) => sum + item.total, 0);
  return (numerator / total) * 100;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
