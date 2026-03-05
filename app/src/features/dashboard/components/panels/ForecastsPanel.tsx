import { memo } from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { ForecastSection } from '@/features/metrics/components/ForecastSection';
import { MetricsSummaryCard } from '@/features/metrics/components/MetricsSummaryCard';
import { formatUIErrorMessage } from '@/lib/api/errors';
import type {
  ForecastRange,
  ForecastsAnalyticsResponse,
  SnapshotForecastRebuildJobResponse,
  UIError,
} from '@/lib/api/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { TabsContent } from '@/shared/ui/tabs';
import {
  PanelEmptyState,
  PanelErrorState,
  PanelFailedState,
  PanelLoadingState,
  PanelProcessingState,
} from './PanelStates';

interface ForecastsPanelProps {
  data: ForecastsAnalyticsResponse | null;
  loading: boolean;
  error: UIError | null;
  canRebuildForecasts?: boolean;
  rebuildLoading?: boolean;
  rebuildError?: UIError | null;
  rebuildJob?: SnapshotForecastRebuildJobResponse | null;
  onRebuildForecasts?: () => void | Promise<void>;
  range: ForecastRange;
  onRangeChange: (range: ForecastRange) => void;
  onRetry: () => void;
  readModelState: 'ready' | 'processing' | 'failed';
  readModelStatus: string | null;
  readModelError: UIError | null;
  readModelPollingTimedOut: boolean;
  onReadModelRetry: () => void;
}

const FORECAST_RANGE_OPTIONS: Array<{ value: ForecastRange; label: string }> = [
  { value: 'short', label: 'Short Term (1 year)' },
  { value: 'medium', label: 'Medium Term (2–4 Years)' },
  { value: 'long', label: 'Long Term (5+ Years)' },
];

function ForecastsPanelComponent({
  data,
  loading,
  error,
  canRebuildForecasts = false,
  rebuildLoading = false,
  rebuildError = null,
  rebuildJob = null,
  onRebuildForecasts,
  range,
  onRangeChange,
  onRetry,
  readModelState,
  readModelStatus,
  readModelError,
  readModelPollingTimedOut,
  onReadModelRetry,
}: ForecastsPanelProps) {
  const lifecycleState = data?.state ?? 'READY';
  const isLegacyNeedsRebuildError = error?.code === 'NEEDS_REBUILD';
  const isNeedsRebuildState =
    Boolean(data) && lifecycleState === 'NEEDS_REBUILD';
  const isFailedLifecycleState = Boolean(data) && lifecycleState === 'FAILED';
  const isReadyLifecycleState = data !== null && lifecycleState === 'READY';
  const methodologySummary =
    data?.methodologySummary?.trim() ||
    'Methodology details were not provided by the backend.';
  const assumptions = data?.assumptions ?? [];
  const coverageRange =
    data?.dataCoverage?.minAcademicPeriod ||
    data?.dataCoverage?.maxAcademicPeriod
      ? [
          data?.dataCoverage?.minAcademicPeriod ?? 'Unknown',
          data?.dataCoverage?.maxAcademicPeriod ?? 'Unknown',
        ].join(' to ')
      : null;
  const growthPct = data?.fiveYearGrowthPct;

  return (
    <TabsContent value="forecasts" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Predictive Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            Student forecasts and data-driven insights
          </p>
        </div>
        <div className="w-full sm:w-[220px]">
          <Select
            value={range}
            onValueChange={(value) => {
              if (value === 'short' || value === 'medium' || value === 'long') {
                onRangeChange(value);
              }
            }}
          >
            <SelectTrigger aria-label="Select forecast range">
              <SelectValue placeholder="Forecast range" />
            </SelectTrigger>
            <SelectContent>
              {FORECAST_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {readModelState === 'processing' && (
        <PanelProcessingState
          status={readModelStatus}
          message={
            readModelPollingTimedOut
              ? 'Dataset is still processing. Automatic status checks are paused. Use Refresh status to check again.'
              : 'Dataset processing is in progress. Forecast analytics will refresh automatically when ready.'
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
        <PanelLoadingState message="Loading forecast analytics..." />
      )}
      {readModelState === 'ready' &&
        !loading &&
        !data &&
        isLegacyNeedsRebuildError && (
          <Card className="border-amber-300/60 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Forecast rebuild required
              </CardTitle>
              <CardDescription>
                {formatUIErrorMessage(
                  error,
                  'Forecasts are not ready yet for this dataset.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {canRebuildForecasts && onRebuildForecasts ? (
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer bg-transparent"
                  disabled={rebuildLoading}
                  onClick={() => {
                    void onRebuildForecasts();
                  }}
                >
                  {rebuildLoading ? 'Starting rebuild…' : 'Rebuild forecasts'}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Contact an admin to rebuild forecasts using the Admin Console.
                </p>
              )}
              {rebuildError && (
                <p className="text-sm text-destructive">
                  {rebuildError.code}: {formatUIErrorMessage(rebuildError)}
                </p>
              )}
              {rebuildJob && (
                <p className="text-sm text-muted-foreground">
                  Rebuild requested (job {rebuildJob.jobId}, status:{' '}
                  {rebuildJob.status}).
                </p>
              )}
            </CardContent>
          </Card>
        )}
      {readModelState === 'ready' &&
        !loading &&
        error &&
        !isLegacyNeedsRebuildError && (
          <PanelErrorState
            message={formatUIErrorMessage(error)}
            onRetry={() => {
              onRetry();
            }}
          />
        )}
      {readModelState === 'ready' && !loading && !error && !data && (
        <PanelEmptyState
          title="No forecast analytics available"
          description="Forecast metrics will appear here when historical data is ready."
        />
      )}
      {readModelState === 'ready' &&
        !loading &&
        !error &&
        isNeedsRebuildState && (
          <Card className="border-amber-300/60 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Forecast rebuild required
              </CardTitle>
              <CardDescription>
                {data?.reason ??
                  'Forecasts are not currently available for this snapshot.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {data?.suggestedAction ??
                  'Rebuild forecast read models, then refresh the Forecasts tab.'}
              </p>
              {canRebuildForecasts && onRebuildForecasts ? (
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer bg-transparent"
                  disabled={rebuildLoading}
                  onClick={() => {
                    void onRebuildForecasts();
                  }}
                >
                  {rebuildLoading ? 'Starting rebuild…' : 'Rebuild forecasts'}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Contact an admin to rebuild forecasts using the Admin Console.
                </p>
              )}
              {rebuildError && (
                <p className="text-sm text-destructive">
                  {rebuildError.code}: {formatUIErrorMessage(rebuildError)}
                </p>
              )}
              {rebuildJob && (
                <p className="text-sm text-muted-foreground">
                  Rebuild requested (job {rebuildJob.jobId}, status:{' '}
                  {rebuildJob.status}). Refresh this tab in a moment to check if
                  forecasts are ready.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      {readModelState === 'ready' &&
        !loading &&
        !error &&
        isFailedLifecycleState && (
          <Card className="border-destructive/50 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Forecast generation failed
              </CardTitle>
              <CardDescription className="text-sm">
                {data?.error?.code ?? 'FORECAST_FAILED'}:{' '}
                {data?.error?.message ?? 'Forecast processing failed.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Contact an admin to review dataset/submission status and
                forecast rebuild job results in the Admin Console, then rebuild
                forecasts or upload a corrected dataset.
              </p>
              <p className="text-sm text-muted-foreground">
                Methodology summary: {methodologySummary}
              </p>
            </CardContent>
          </Card>
        )}
      {readModelState === 'ready' &&
        !loading &&
        !error &&
        isReadyLifecycleState &&
        data && (
          <>
            <Card className="border-border bg-card">
              <CardHeader className="gap-1">
                <CardTitle className="text-base">
                  Forecast methodology
                </CardTitle>
                <CardDescription>
                  Backend-provided methodology and assumptions used for this
                  forecast view.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-foreground">{methodologySummary}</p>
                {coverageRange && (
                  <p className="text-sm text-muted-foreground">
                    Data coverage: {coverageRange}
                  </p>
                )}
                {assumptions.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {assumptions.map((assumption) => (
                      <li key={assumption}>{assumption}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <MetricsSummaryCard
              title="5-Year Growth"
              value={
                typeof growthPct === 'number'
                  ? `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%`
                  : 'Unavailable'
              }
              change={typeof growthPct === 'number' ? growthPct : undefined}
              icon={TrendingUp}
              description="Projected over next 5 years"
            />
            <ForecastSection
              historicalData={data.historical}
              forecastData={data.forecast}
              fiveYearGrowthPct={growthPct}
              insights={data.insights ?? undefined}
            />
          </>
        )}
    </TabsContent>
  );
}

export const ForecastsPanel = memo(ForecastsPanelComponent);
