'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import type { ActiveMajorInsightItem } from '@/lib/api/types';

interface ActiveMajorsBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeMajors: number;
  activeMajorInsights: ActiveMajorInsightItem[];
  dateLabel: string;
}

export function ActiveMajorsBreakdownModal({
  open,
  onOpenChange,
  activeMajors,
  activeMajorInsights,
  dateLabel,
}: ActiveMajorsBreakdownModalProps) {
  const orderedMajors = [...activeMajorInsights].sort((a, b) => {
    if (b.total !== a.total) {
      return b.total - a.total;
    }
    return a.major.localeCompare(b.major);
  });
  const activeStudentsTotal = orderedMajors.reduce(
    (sum, item) => sum + item.total,
    0
  );
  const topMajorCount = orderedMajors[0]?.total ?? 0;
  const topMajorSharePct =
    activeStudentsTotal > 0 ? (topMajorCount / activeStudentsTotal) * 100 : 0;
  const topThreeSharePct = summarizeTopShare(
    orderedMajors,
    3,
    activeStudentsTotal
  );
  const topFiveSharePct = summarizeTopShare(
    orderedMajors,
    5,
    activeStudentsTotal
  );
  const topMajors = orderedMajors.slice(0, 3);
  const internationalLeaders = [...orderedMajors]
    .filter((item) => item.total >= 20)
    .sort((a, b) => {
      if (b.internationalPct !== a.internationalPct) {
        return b.internationalPct - a.internationalPct;
      }
      return b.total - a.total;
    })
    .slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Active Majors Breakdown</DialogTitle>
          <DialogDescription>
            Undergraduate active-major insights for the selected data date.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-4">
          <SummaryTile
            label="Active majors"
            value={activeMajors.toLocaleString()}
          />
          <SummaryTile
            label="Active undergraduate students"
            value={activeStudentsTotal.toLocaleString()}
          />
          <SummaryTile
            label="Largest major share"
            value={formatPercent(topMajorSharePct)}
          />
          <SummaryTile
            label="Top 5 combined share"
            value={formatPercent(topFiveSharePct)}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-secondary/40 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              Top Active Majors
            </p>
            <div className="mt-3 space-y-2">
              {topMajors.length === 0 ? (
                <div className="rounded-md bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                  No active-major insight data is available.
                </div>
              ) : (
                topMajors.map((item) => (
                  <div
                    key={item.major}
                    className="flex items-start justify-between gap-3 rounded-md bg-background/70 px-3 py-2 text-xs text-muted-foreground"
                  >
                    <p className="text-foreground">{item.major}</p>
                    <p className="shrink-0 text-right">
                      <span className="block font-semibold text-foreground">
                        {item.total.toLocaleString()} students
                      </span>
                      <span>
                        {formatPercent(item.shareOfActivePct)} | Intl{' '}
                        {formatPercent(item.internationalPct)}
                      </span>
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-secondary/40 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              International Spotlight
            </p>
            <div className="mt-3 space-y-2">
              {internationalLeaders.length === 0 ? (
                <div className="rounded-md bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                  No majors with at least 20 active students to display.
                </div>
              ) : (
                internationalLeaders.map((item) => (
                  <div
                    key={item.major}
                    className="flex items-start justify-between gap-3 rounded-md bg-background/70 px-3 py-2 text-xs text-muted-foreground"
                  >
                    <p className="text-foreground">{item.major}</p>
                    <p className="shrink-0 text-right">
                      <span className="block font-semibold text-foreground">
                        {item.total.toLocaleString()} students
                      </span>
                      <span>{formatPercent(item.internationalPct)}</span>
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Top 3 majors account for {formatPercent(topThreeSharePct)} of active
          undergraduate major records. Counts reflect selected Data Date:{' '}
          {dateLabel}
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
  majors: ActiveMajorInsightItem[],
  topN: number,
  total: number
): number {
  if (total <= 0) {
    return 0;
  }
  const numerator = majors
    .slice(0, topN)
    .reduce((sum, item) => sum + item.total, 0);
  return (numerator / total) * 100;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
