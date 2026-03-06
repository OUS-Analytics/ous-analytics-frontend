'use client';

import type { ComponentType } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog';
import type {
  UndergraduateBreakdownInsightItem,
  UndergraduateBreakdownInsightTopItem,
  UndergraduateBreakdownItem,
} from '@/lib/api/types';
import { ArrowRightLeft, BookOpen, GraduationCap, Layers } from 'lucide-react';

interface BreakdownData {
  total: number;
  undergrad: number;
}

interface AnalyticsBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: BreakdownData;
  undergraduateBreakdown: UndergraduateBreakdownItem[];
  undergraduateBreakdownInsights: UndergraduateBreakdownInsightItem[];
  dateLabel: string;
}

const subgroupOrder: Array<{
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { key: 'FTIC', label: 'FTIC Students', icon: GraduationCap },
  { key: 'Transfer', label: 'Transfer Students', icon: ArrowRightLeft },
  { key: 'Continuing', label: 'Continuing Students', icon: BookOpen },
  { key: 'Other', label: 'Other Undergraduate', icon: Layers },
];

export function AnalyticsBreakdownModal({
  open,
  onOpenChange,
  data,
  undergraduateBreakdown,
  undergraduateBreakdownInsights,
  dateLabel,
}: AnalyticsBreakdownModalProps) {
  const subgroupLookup = new Map(
    undergraduateBreakdown.map((row) => [row.studentType, row])
  );
  const insightLookup = new Map(
    undergraduateBreakdownInsights.map((row) => [row.studentType, row])
  );
  const orderedBreakdown = subgroupOrder
    .map((subgroup) => {
      const found = subgroupLookup.get(subgroup.key);
      const insights = insightLookup.get(subgroup.key);
      const fallbackShare =
        data.undergrad > 0 ? (100 * (found?.total ?? 0)) / data.undergrad : 0;
      return {
        ...subgroup,
        total: found?.total ?? 0,
        international: found?.international ?? 0,
        nonInternational: found?.nonInternational ?? 0,
        shareOfUndergradPct: insights?.shareOfUndergradPct ?? fallbackShare,
        avgCumulativeGPA: insights?.avgCumulativeGPA ?? null,
        avgCumulativeCreditsEarned:
          insights?.avgCumulativeCreditsEarned ?? null,
        topMajors: insights?.topMajors ?? [],
        topSchools: insights?.topSchools ?? [],
      };
    })
    .filter((row) => row.total > 0 || row.key !== 'Other');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Student Breakdown</DialogTitle>
          <DialogDescription>
            Undergraduate composition for the selected data date.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-3">
          {orderedBreakdown.map((metric) => (
            <div
              key={metric.key}
              className="h-full rounded-lg border border-border/60 bg-secondary/60 px-4 py-3"
            >
              <div className="w-full">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <metric.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {metric.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPercent(metric.shareOfUndergradPct)} of
                        undergraduate total
                      </p>
                    </div>
                  </div>
                  <p className="text-right">
                    <span className="block text-lg font-bold text-foreground">
                      {metric.total.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      students
                    </span>
                  </p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="rounded-md bg-background/70 px-2 py-1">
                    International: {metric.international.toLocaleString()}
                  </div>
                  <div className="rounded-md bg-background/70 px-2 py-1">
                    Non-International:{' '}
                    {metric.nonInternational.toLocaleString()}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="rounded-md bg-background/70 px-2 py-1">
                    Avg cumulative GPA:{' '}
                    {formatNullableNumber(metric.avgCumulativeGPA, 0.1)}
                  </div>
                  <div className="rounded-md bg-background/70 px-2 py-1">
                    Avg earned credits:{' '}
                    {formatNullableNumber(
                      metric.avgCumulativeCreditsEarned,
                      0.1
                    )}
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div className="rounded-md bg-background/70 px-2 py-1">
                    Top majors: {formatTopLabels(metric.topMajors)}
                  </div>
                  <div className="rounded-md bg-background/70 px-2 py-1">
                    Top schools: {formatTopLabels(metric.topSchools)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Counts reflect selected Data Date: {dateLabel}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function formatTopLabels(
  items: UndergraduateBreakdownInsightTopItem[]
): string {
  if (items.length === 0) {
    return 'N/A';
  }

  return items
    .map((item) => {
      return `${item.label} (${item.count.toLocaleString()}, ${formatPercent(
        item.pctOfGroup
      )})`;
    })
    .join(' | ');
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatNullableNumber(
  value: number | null,
  minDisplayValue: number
): string {
  if (value === null || Number.isNaN(value) || value < minDisplayValue) {
    return 'N/A';
  }
  return value.toFixed(2);
}
