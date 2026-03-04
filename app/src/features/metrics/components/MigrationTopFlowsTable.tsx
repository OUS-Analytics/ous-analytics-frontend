'use client';

import { memo, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import {
  getMigrationPeriodLabel,
  getTopMigrationFlows,
} from '@/features/metrics/selectors';
import type { MigrationRecord } from '@/features/metrics/types';

interface MigrationTopFlowsTableProps {
  data: MigrationRecord[];
  selectedSemester?: string;
  periodLabel?: string;
}

function MigrationTopFlowsTableComponent({
  data,
  selectedSemester,
  periodLabel: periodLabelOverride,
}: MigrationTopFlowsTableProps) {
  const sortedMigrations = useMemo(
    () => getTopMigrationFlows(data, selectedSemester, 10),
    [data, selectedSemester]
  );
  const periodLabel = useMemo(
    () => periodLabelOverride ?? getMigrationPeriodLabel(selectedSemester),
    [periodLabelOverride, selectedSemester]
  );

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-foreground">
          Top Migration Paths
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Most common major changes ({periodLabel})
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedMigrations.length === 0 && (
            <p className="rounded-lg bg-secondary/30 px-3 py-6 text-sm text-muted-foreground">
              No migration paths available for this selection.
            </p>
          )}
          {sortedMigrations.map((migration, index) => (
            <div
              key={`${migration.fromMajor}-${migration.toMajor}`}
              className="rounded-xl border border-border/70 bg-secondary/40 px-3 py-3"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-xs font-medium text-primary">
                  {index + 1}
                </span>
                <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-start sm:gap-2">
                  <span className="break-words text-sm text-foreground">
                    {migration.fromMajor}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary/90 sm:mt-0.5" />
                  <span className="break-words text-sm text-foreground">
                    {migration.toMajor}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-semibold leading-none text-chart-1">
                    {migration.totalCount.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">students</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export const MigrationTopFlowsTable = memo(MigrationTopFlowsTableComponent);
