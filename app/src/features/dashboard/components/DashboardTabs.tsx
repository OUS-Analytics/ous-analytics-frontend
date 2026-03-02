import { useCallback, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { formatUIErrorMessage } from '@/lib/api/errors';
import type { DashboardUploadFeedback } from '@/features/dashboard/types/uploadFeedback';
import type {
  DatasetOverviewResponse,
  ForecastsAnalyticsResponse,
  MajorsAnalyticsResponse,
  MigrationAnalyticsResponse,
  SnapshotForecastRebuildJobResponse,
  UIError,
} from '@/lib/api/types';
import { DateFilterButton } from '@/features/filters/components/DateFilterButton';
import type { MajorsFilterValues } from '@/features/filters/components/MajorsFilterPanel';
import { PanelEmptyState } from './panels/PanelStates';
import { ForecastsPanel } from './panels/ForecastsPanel';
import { MajorsPanel } from './panels/MajorsPanel';
import { MigrationPanel } from './panels/MigrationPanel';
import { OverviewPanel } from './panels/OverviewPanel';

interface DashboardTabsProps {
  model: DashboardTabsModel;
}

interface DashboardTabsModel {
  selectedDate: Date | null;
  setSelectedDate: (date: Date) => void;
  currentDataDate: string | null;
  availableSnapshotDates: Date[];
  snapshotDatesLoading: boolean;
  snapshotDatesError: UIError | null;
  snapshotDateEmptyState: {
    title: string;
    description: string;
  } | null;
  latestAvailableSnapshotDate: string | null;
  canGoToLatestAvailableDate: boolean;
  goToLatestAvailableDate: () => void;
  handleDatasetUpload: (file: File) => void;
  uploadLoading: boolean;
  uploadError: UIError | null;
  uploadFeedback: DashboardUploadFeedback | null;
  uploadRetryAvailable: boolean;
  retryDatasetUpload: () => void;
  readModelState: 'ready' | 'processing' | 'failed';
  readModelStatus: string | null;
  readModelError: UIError | null;
  readModelPollingTimedOut: boolean;
  retryReadModelState: () => void;
  breakdownOpen: boolean;
  setBreakdownOpen: (isOpen: boolean) => void;
  overviewData: DatasetOverviewResponse | null;
  overviewLoading: boolean;
  overviewError: UIError | null;
  retryOverview: () => void;
  majorsData: MajorsAnalyticsResponse | null;
  majorsLoading: boolean;
  majorsError: UIError | null;
  majorsFilters: MajorsFilterValues;
  setMajorsFilters: (filters: MajorsFilterValues) => void;
  majorsFilterOptions: {
    academicPeriodOptions: string[];
    schoolOptions: string[];
    studentTypeOptions: string[];
  };
  retryMajors: () => void;
  migrationData: MigrationAnalyticsResponse | null;
  migrationLoading: boolean;
  migrationError: UIError | null;
  migrationSemester?: string;
  setMigrationSemester: (value: string | undefined) => void;
  retryMigration: () => void;
  forecastsData: ForecastsAnalyticsResponse | null;
  forecastsLoading: boolean;
  forecastsError: UIError | null;
  canRebuildForecasts?: boolean;
  forecastRebuildLoading?: boolean;
  forecastRebuildError?: UIError | null;
  forecastRebuildJob?: SnapshotForecastRebuildJobResponse | null;
  rebuildForecasts?: () => void | Promise<void>;
  forecastHorizon: number;
  setForecastHorizon: (horizon: number) => void;
  retryForecasts: () => void;
}

const DASHBOARD_TAB_VALUES = [
  'overview',
  'majors',
  'migration',
  'forecasts',
] as const;

type DashboardTabValue = (typeof DASHBOARD_TAB_VALUES)[number];

function isDashboardTabValue(value: string): value is DashboardTabValue {
  return DASHBOARD_TAB_VALUES.includes(value as DashboardTabValue);
}

function formatCurrentDataDateLabel(value: string | null) {
  if (!value) {
    return 'Unavailable';
  }

  const [yearRaw, monthRaw, dayRaw] = value.split('-');
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  const day = Number(dayRaw);
  const parsed = new Date(year, monthIndex, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== monthIndex ||
    parsed.getDate() !== day
  ) {
    return value;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DashboardTabs(props: DashboardTabsProps) {
  const { model } = props;
  const [activeTab, setActiveTab] = useState<DashboardTabValue>('overview');
  const onTabChange = useCallback((nextValue: string) => {
    if (isDashboardTabValue(nextValue)) {
      setActiveTab(nextValue);
    }
  }, []);

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Current data date:{' '}
            {formatCurrentDataDateLabel(model.currentDataDate)}
          </p>
          {model.snapshotDatesError && (
            <p className="text-xs text-destructive">
              {formatUIErrorMessage(model.snapshotDatesError)}
            </p>
          )}
        </div>
        <DateFilterButton
          date={model.selectedDate}
          onDateChange={model.setSelectedDate}
          availableDates={model.availableSnapshotDates}
          disabled={
            model.snapshotDatesLoading ||
            model.availableSnapshotDates.length === 0
          }
        />
      </div>
      <TabsList className="bg-secondary">
        <TabsTrigger
          value="overview"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="majors"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          Majors
        </TabsTrigger>
        <TabsTrigger
          value="migration"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          Migration
        </TabsTrigger>
        <TabsTrigger
          value="forecasts"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          Forecasts
        </TabsTrigger>
      </TabsList>

      {model.snapshotDateEmptyState ? (
        <PanelEmptyState
          title={model.snapshotDateEmptyState.title}
          description={model.snapshotDateEmptyState.description}
          actionLabel={
            model.canGoToLatestAvailableDate
              ? 'Go to latest available'
              : undefined
          }
          onAction={
            model.canGoToLatestAvailableDate
              ? model.goToLatestAvailableDate
              : undefined
          }
        />
      ) : activeTab === 'overview' ? (
        <OverviewPanel
          currentDataDate={model.currentDataDate}
          onDatasetUpload={model.handleDatasetUpload}
          uploadLoading={model.uploadLoading}
          uploadError={model.uploadError}
          uploadFeedback={model.uploadFeedback}
          uploadRetryAvailable={model.uploadRetryAvailable}
          onRetryUpload={model.retryDatasetUpload}
          breakdownOpen={model.breakdownOpen}
          onBreakdownOpenChange={model.setBreakdownOpen}
          data={model.overviewData}
          loading={model.overviewLoading}
          error={model.overviewError}
          onRetry={model.retryOverview}
          readModelState={model.readModelState}
          readModelStatus={model.readModelStatus}
          readModelError={model.readModelError}
          readModelPollingTimedOut={model.readModelPollingTimedOut}
          onReadModelRetry={model.retryReadModelState}
        />
      ) : null}
      {!model.snapshotDateEmptyState && activeTab === 'majors' && (
        <MajorsPanel
          data={model.majorsData}
          loading={model.majorsLoading}
          error={model.majorsError}
          onRetry={model.retryMajors}
          filters={model.majorsFilters}
          onFiltersChange={model.setMajorsFilters}
          academicPeriodOptions={
            model.majorsFilterOptions.academicPeriodOptions
          }
          schoolOptions={model.majorsFilterOptions.schoolOptions}
          studentTypeOptions={model.majorsFilterOptions.studentTypeOptions}
          readModelState={model.readModelState}
          readModelStatus={model.readModelStatus}
          readModelError={model.readModelError}
          readModelPollingTimedOut={model.readModelPollingTimedOut}
          onReadModelRetry={model.retryReadModelState}
        />
      )}
      {!model.snapshotDateEmptyState && activeTab === 'migration' && (
        <MigrationPanel
          data={model.migrationData}
          loading={model.migrationLoading}
          error={model.migrationError}
          migrationSemester={model.migrationSemester}
          onSemesterChange={model.setMigrationSemester}
          onRetry={model.retryMigration}
          readModelState={model.readModelState}
          readModelStatus={model.readModelStatus}
          readModelError={model.readModelError}
          readModelPollingTimedOut={model.readModelPollingTimedOut}
          onReadModelRetry={model.retryReadModelState}
        />
      )}
      {!model.snapshotDateEmptyState && activeTab === 'forecasts' && (
        <ForecastsPanel
          data={model.forecastsData}
          loading={model.forecastsLoading}
          error={model.forecastsError}
          canRebuildForecasts={model.canRebuildForecasts}
          rebuildLoading={model.forecastRebuildLoading}
          rebuildError={model.forecastRebuildError ?? null}
          rebuildJob={model.forecastRebuildJob ?? null}
          onRebuildForecasts={model.rebuildForecasts}
          horizon={model.forecastHorizon}
          onHorizonChange={model.setForecastHorizon}
          onRetry={model.retryForecasts}
          readModelState={model.readModelState}
          readModelStatus={model.readModelStatus}
          readModelError={model.readModelError}
          readModelPollingTimedOut={model.readModelPollingTimedOut}
          onReadModelRetry={model.retryReadModelState}
        />
      )}
    </Tabs>
  );
}
