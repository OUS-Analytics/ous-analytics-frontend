'use client';

import { memo, useMemo } from 'react';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import {
  getMigrationPeriodLabel,
  getTopMigrationFlows,
} from '@/features/metrics/selectors';
import type { MigrationRecord } from '@/features/metrics/types';
import { MigrationFlowBars } from './MigrationFlowBars';
import { MigrationFlowEmptyState } from './MigrationFlowEmptyState';

interface MigrationFlowChartProps {
  data: MigrationRecord[];
  selectedSemester?: string;
  periodLabel?: string;
}

function MigrationFlowChartComponent({
  data,
  selectedSemester,
  periodLabel: periodLabelOverride,
}: MigrationFlowChartProps) {
  const sortedMigrations = useMemo(
    () => getTopMigrationFlows(data, selectedSemester, 12),
    [data, selectedSemester]
  );
  const periodLabel = useMemo(
    () => periodLabelOverride ?? getMigrationPeriodLabel(selectedSemester),
    [periodLabelOverride, selectedSemester]
  );

  if (sortedMigrations.length === 0) {
    return <MigrationFlowEmptyState />;
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-foreground">
          Major Migration Flow
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Top student movements between majors ({periodLabel})
        </p>
      </CardHeader>
      <CardContent>
        <MigrationFlowBars flows={sortedMigrations} />
        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/10 p-4">
          <div className="flex items-center gap-2 text-primary">
            <Lightbulb className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">
              Key Insight
            </p>
          </div>
          <p className="mt-2 text-sm leading-6 text-foreground">
            <span className="font-semibold">
              {sortedMigrations[0]?.fromMajor}
            </span>
            <ArrowRight className="mx-2 inline h-4 w-4 align-text-bottom text-primary" />
            <span className="font-semibold">
              {sortedMigrations[0]?.toMajor}
            </span>{' '}
            has the largest movement with{' '}
            <span className="font-semibold text-primary">
              {sortedMigrations[0]?.totalCount.toLocaleString()} students
            </span>{' '}
            in this range.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export const MigrationFlowChart = memo(MigrationFlowChartComponent);
