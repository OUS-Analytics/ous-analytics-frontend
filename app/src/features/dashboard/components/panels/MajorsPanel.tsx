import { memo, useMemo } from 'react';
import { Building, GraduationCap, Users } from 'lucide-react';
import { CohortSummaryTable } from '@/features/metrics/components/CohortSummaryTable';
import { MajorDistributionChart } from '@/features/metrics/components/charts/MajorDistributionChart';
import {
  AvgCreditsByCohortChart,
  AvgCreditsByMajorChart,
  AvgGPAByCohortChart,
  AvgGPAByMajorChart,
} from '@/features/metrics/components/major-analytics-charts';
import { formatUIErrorMessage } from '@/lib/api/errors';
import { MetricsSummaryCard } from '@/features/metrics/components/MetricsSummaryCard';
import type { MajorsAnalyticsResponse, UIError } from '@/lib/api/types';
import { TabsContent } from '@/shared/ui/tabs';
import { selectTopMajorLabel } from '@/features/metrics/utils/metrics-summary-utils';
import {
  MajorsFilterPanel,
  type MajorsFilterValues,
} from '@/features/filters/components/MajorsFilterPanel';
import {
  PanelEmptyState,
  PanelErrorState,
  PanelFailedState,
  PanelLoadingState,
  PanelProcessingState,
} from './PanelStates';

interface MajorsPanelProps {
  data: MajorsAnalyticsResponse | null;
  loading: boolean;
  error: UIError | null;
  onRetry: () => void;
  filters: MajorsFilterValues;
  onFiltersChange: (filters: MajorsFilterValues) => void;
  academicPeriodOptions: string[];
  schoolOptions: string[];
  studentTypeOptions: string[];
  readModelState: 'ready' | 'processing' | 'failed';
  readModelStatus: string | null;
  readModelError: UIError | null;
  readModelPollingTimedOut: boolean;
  onReadModelRetry: () => void;
}

function hasActiveFilters(filters: MajorsFilterValues): boolean {
  return (
    filters.academicPeriod !== undefined ||
    filters.school !== undefined ||
    filters.studentType !== undefined
  );
}

function MajorsPanelComponent({
  data,
  loading,
  error,
  onRetry,
  filters,
  onFiltersChange,
  academicPeriodOptions,
  schoolOptions,
  studentTypeOptions,
  readModelState,
  readModelStatus,
  readModelError,
  readModelPollingTimedOut,
  onReadModelRetry,
}: MajorsPanelProps) {
  const majorData = useMemo(() => data?.majorDistribution ?? [], [data]);
  const cohortData = useMemo(() => data?.cohortRecords ?? [], [data]);
  const { totalMajors, averagePerMajor } = useMemo(() => {
    const total = majorData.length;
    const average = Math.round(
      total === 0
        ? 0
        : majorData.reduce((sum, major) => sum + major.count, 0) / total
    );

    return {
      totalMajors: total,
      averagePerMajor: average,
    };
  }, [majorData]);

  const hasFilters = hasActiveFilters(filters);
  const hasData = data !== null;
  const hasNoMajorResults = hasData && majorData.length === 0;
  const showFilterPanel = readModelState === 'ready' && hasData;
  const showDataView =
    readModelState === 'ready' &&
    !loading &&
    !error &&
    hasData &&
    !(hasNoMajorResults && hasFilters);
  const showFilteredEmptyState =
    readModelState === 'ready' &&
    !loading &&
    !error &&
    hasData &&
    hasNoMajorResults &&
    hasFilters;

  return (
    <TabsContent value="majors" className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Majors</h2>
        <p className="text-sm text-muted-foreground">
          Major-level analytics and cohort breakdowns
        </p>
      </div>
      {readModelState === 'processing' && (
        <PanelProcessingState
          status={readModelStatus}
          message={
            readModelPollingTimedOut
              ? 'Dataset is still processing. Automatic status checks are paused. Use Refresh status to check again.'
              : 'Dataset processing is in progress. Majors analytics will refresh automatically when ready.'
          }
          onRefresh={() => {
            void onReadModelRetry();
          }}
        />
      )}
      {readModelState === 'failed' && (
        <PanelFailedState
          message={formatUIErrorMessage(
            readModelError,
            'Dataset processing failed. Upload a new dataset to continue.'
          )}
          onRefresh={() => {
            void onReadModelRetry();
          }}
        />
      )}
      {readModelState === 'ready' && loading && (
        <PanelLoadingState message="Loading majors analytics..." />
      )}
      {readModelState === 'ready' && !loading && error && (
        <PanelErrorState
          message={formatUIErrorMessage(error)}
          onRetry={() => {
            onRetry();
          }}
        />
      )}
      {readModelState === 'ready' && !loading && !error && !data && (
        <PanelEmptyState
          title="No majors analytics available"
          description="Majors metrics will appear here after dataset processing."
        />
      )}
      {showFilterPanel && (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <MajorsFilterPanel
              filters={filters}
              onFiltersChange={onFiltersChange}
              academicPeriodOptions={academicPeriodOptions}
              schoolOptions={schoolOptions}
              studentTypeOptions={studentTypeOptions}
            />
          </aside>
          <main className="space-y-6">
            {showFilteredEmptyState && (
              <PanelEmptyState
                title="No results for selected filters"
                description="Try adjusting your semester, school, or student type filters."
              />
            )}
            {showDataView && (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricsSummaryCard
                    title="Top Major"
                    value={selectTopMajorLabel(majorData)}
                    icon={GraduationCap}
                    description={`${(majorData[0]?.count ?? 0).toLocaleString()} students`}
                  />
                  <MetricsSummaryCard
                    title="Total Programs"
                    value={totalMajors}
                    icon={Building}
                    description="Active majors"
                  />
                  <MetricsSummaryCard
                    title="Avg per Major"
                    value={averagePerMajor}
                    icon={Users}
                    description="Students per major"
                  />
                </div>
                <MajorDistributionChart
                  data={majorData}
                  title="Top Majors Overview"
                />
                <div className="grid gap-6 lg:grid-cols-2">
                  <AvgGPAByMajorChart data={cohortData} />
                  <AvgCreditsByMajorChart data={cohortData} />
                </div>
                <AvgGPAByCohortChart data={cohortData} />
                <AvgCreditsByCohortChart data={cohortData} />
                <CohortSummaryTable data={cohortData} />
              </>
            )}
          </main>
        </div>
      )}
    </TabsContent>
  );
}

export const MajorsPanel = memo(MajorsPanelComponent);
