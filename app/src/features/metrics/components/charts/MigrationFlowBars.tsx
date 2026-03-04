import { ArrowRight } from 'lucide-react';
import type { AggregatedMigration } from '@/features/metrics/selectors/migration-selectors';

interface MigrationFlowBarsProps {
  flows: AggregatedMigration[];
}

const BAR_COLORS = [
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
];

export function MigrationFlowBars({ flows }: MigrationFlowBarsProps) {
  const maxCount = flows[0]?.totalCount || 1;

  return (
    <div className="space-y-4">
      {flows.map((migration, index) => (
        <div
          key={`${migration.fromMajor}-${migration.toMajor}`}
          className="group"
        >
          <div className="mb-2 grid gap-1 text-sm">
            <div className="grid items-start gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <span className="break-words font-medium text-foreground">
                {migration.fromMajor}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-primary/90 sm:mt-0.5" />
              <span className="break-words font-medium text-foreground">
                {migration.toMajor}
              </span>
            </div>
            <span className="text-sm font-medium text-muted-foreground sm:justify-self-end">
              {migration.totalCount.toLocaleString()} students
            </span>
          </div>
          <div className="h-6 w-full overflow-hidden rounded-lg bg-secondary">
            <div
              className={`h-full ${BAR_COLORS[index % BAR_COLORS.length]} transition-all duration-500 ease-out group-hover:opacity-90`}
              style={{ width: `${(migration.totalCount / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
