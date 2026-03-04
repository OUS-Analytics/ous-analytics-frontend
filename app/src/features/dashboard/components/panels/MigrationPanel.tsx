import { memo, useMemo } from 'react';
import { SemesterRangeFilterSelect } from '@/features/filters/components/SemesterRangeFilterSelect';
import { MigrationFlowChart } from '@/features/metrics/components/charts/MigrationFlowChart';
import { MigrationTopFlowsTable } from '@/features/metrics/components/MigrationTopFlowsTable';
import { formatUIErrorMessage } from '@/lib/api/errors';
import type { MigrationAnalyticsResponse, UIError } from '@/lib/api/types';
import { TabsContent } from '@/shared/ui/tabs';
import {
  PanelEmptyState,
  PanelErrorState,
  PanelFailedState,
  PanelLoadingState,
  PanelProcessingState,
} from './PanelStates';

interface MigrationPanelProps {
  data: MigrationAnalyticsResponse | null;
  loading: boolean;
  error: UIError | null;
  migrationStartSemester?: string;
  migrationEndSemester?: string;
  onStartSemesterChange?: (value: string | undefined) => void;
  onEndSemesterChange?: (value: string | undefined) => void;
  onRetry: () => void;
  readModelState: 'ready' | 'processing' | 'failed';
  readModelStatus: string | null;
  readModelError: UIError | null;
  readModelPollingTimedOut: boolean;
  onReadModelRetry: () => void;
}

function MigrationPanelComponent({
  data,
  loading,
  error,
  migrationStartSemester,
  migrationEndSemester,
  onStartSemesterChange,
  onEndSemesterChange,
  onRetry,
  readModelState,
  readModelStatus,
  readModelError,
  readModelPollingTimedOut,
  onReadModelRetry,
}: MigrationPanelProps) {
  const semesterOptions = useMemo(() => data?.semesters ?? [], [data]);
  const migrationData = useMemo(() => data?.records ?? [], [data]);
  const hasMigrationRecords = migrationData.length > 0;
  const handleStartSemesterChange = onStartSemesterChange ?? (() => {});
  const handleEndSemesterChange = onEndSemesterChange ?? (() => {});
  const periodLabel = useMemo(() => {
    if (migrationStartSemester && migrationEndSemester) {
      return migrationStartSemester === migrationEndSemester
        ? migrationStartSemester
        : `${migrationStartSemester} to ${migrationEndSemester}`;
    }
    if (migrationStartSemester) {
      return `${migrationStartSemester} onward`;
    }
    if (migrationEndSemester) {
      return `Up to ${migrationEndSemester}`;
    }
    return 'All Semesters';
  }, [migrationEndSemester, migrationStartSemester]);

  return (
    <TabsContent value="migration" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Major Migration Analysis
          </h2>
          <p className="text-sm text-muted-foreground">
            Track student movement between majors over a selected semester range
          </p>
        </div>
        <SemesterRangeFilterSelect
          startValue={migrationStartSemester}
          endValue={migrationEndSemester}
          onStartValueChange={handleStartSemesterChange}
          onEndValueChange={handleEndSemesterChange}
          options={semesterOptions}
        />
      </div>
      {readModelState === 'processing' && (
        <PanelProcessingState
          status={readModelStatus}
          message={
            readModelPollingTimedOut
              ? 'Dataset is still processing. Automatic status checks are paused. Use Refresh status to check again.'
              : 'Dataset processing is in progress. Migration analytics will refresh automatically when ready.'
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
        <PanelLoadingState message="Loading migration analytics..." />
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
          title="No migration analytics available"
          description="Migration flows will appear here once records are available."
        />
      )}
      {readModelState === 'ready' &&
        !loading &&
        !error &&
        data &&
        !hasMigrationRecords && (
          <PanelEmptyState
            title="No migration detected for selected period"
            description="No major transitions were reported for the current migration selection."
          />
        )}
      {readModelState === 'ready' &&
        !loading &&
        !error &&
        data &&
        hasMigrationRecords && (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <MigrationFlowChart
                data={migrationData}
                periodLabel={periodLabel}
              />
            </div>
            <div className="lg:col-span-5">
              <MigrationTopFlowsTable
                data={migrationData}
                periodLabel={periodLabel}
              />
            </div>
          </div>
        )}
    </TabsContent>
  );
}

export const MigrationPanel = memo(MigrationPanelComponent);
