'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { getActiveDataset, getDatasetById } from '@/features/datasets/api';
import { getForecastsAnalytics } from '@/features/forecasts/api';
import {
  getMajorsAnalytics,
  type MajorsFilterParams,
} from '@/features/majors/api';
import { useMajorsFiltersParam } from '@/features/filters/hooks/useMajorsFiltersParam';
import { getMigrationAnalytics } from '@/features/migration/api';
import { getDatasetOverview } from '@/features/overview/api';
import {
  createSnapshotForecastRebuildJob,
  listSnapshots,
} from '@/features/snapshots/api';
import {
  createDatasetSubmission,
  getDatasetSubmissionStatus,
} from '@/features/submissions/api';
import { ServiceError, toUIError } from '@/lib/api/errors';
import type {
  DatasetOverviewResponse,
  DatasetSubmission,
  DatasetSummary,
  ErrorDetail,
  ForecastsAnalyticsResponse,
  MajorsAnalyticsResponse,
  MigrationAnalyticsResponse,
  SnapshotForecastRebuildJobResponse,
  SnapshotSummary,
  UIError,
} from '@/lib/api/types';
import type { DashboardUploadFeedback } from '@/features/dashboard/types/uploadFeedback';
import {
  createDatasetFailedError,
  getDashboardReadModelStateFromDataset,
  getDashboardReadModelStateFromError,
  getDashboardViewState,
  isActiveDatasetNotFound,
  shouldRetainCurrentReadModelState,
  type DashboardReadModelState,
  type DashboardViewState,
} from './dashboardReadModel';
import {
  resolveSnapshotDateSelection,
  type SnapshotDateSelection,
} from './snapshotSelection';
import {
  formatDateParamValue,
  parseLocalDateFromDateParam,
  useDashboardDateParam,
} from './useDashboardDateParam';

interface AsyncResourceState<T> {
  data: T | null;
  loading: boolean;
  error: UIError | null;
}

type AsyncResourceStateSetter<T> = Dispatch<
  SetStateAction<AsyncResourceState<T>>
>;

const SUBMISSION_POLL_INTERVAL_MIN_MS = 1_000;
const SUBMISSION_POLL_INTERVAL_MAX_MS = 3_000;
const SUBMISSION_POLL_TIMEOUT_MS = 180_000;
export const DATASET_STATUS_POLL_INTERVAL_MS = 3_000;
export const DATASET_STATUS_POLL_MAX_DURATION_MS = 300_000;
const DEFAULT_FORECAST_HORIZON = 4;
const SNAPSHOTS_PAGE_SIZE = 100;
const EMPTY_SNAPSHOT_ITEMS: SnapshotSummary[] = [];

function initialAsyncResourceState<T>(): AsyncResourceState<T> {
  return {
    data: null,
    loading: false,
    error: null,
  };
}

function resetAsyncResourceState<T>(setState: AsyncResourceStateSetter<T>) {
  setState(initialAsyncResourceState);
}

function isAbortedRequest(error: unknown) {
  return error instanceof ServiceError && error.code === 'REQUEST_ABORTED';
}

function getSubmissionPollDelayMs(attempt: number) {
  const steppedDelay = SUBMISSION_POLL_INTERVAL_MIN_MS + attempt * 1_000;
  return Math.min(steppedDelay, SUBMISSION_POLL_INTERVAL_MAX_MS);
}

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(
        new ServiceError('REQUEST_ABORTED', 'The request was cancelled.', true)
      );
      return;
    }

    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
      reject(
        new ServiceError('REQUEST_ABORTED', 'The request was cancelled.', true)
      );
    };

    signal?.addEventListener('abort', onAbort);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStringDetail(details: unknown, keys: string[]) {
  if (!isRecord(details)) {
    return null;
  }

  for (const key of keys) {
    const value = details[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }

  return null;
}

function extractValidationErrors(details: unknown): ErrorDetail[] {
  if (!isRecord(details)) {
    return [];
  }

  const candidates = [
    details.validationErrors,
    details.validation_errors,
    details.errors,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    return candidate.filter((item): item is ErrorDetail => isRecord(item));
  }

  return [];
}

function mapSubmissionStatusToUploadPhase(
  status: DatasetSubmission['status']
): DashboardUploadFeedback['phase'] {
  if (status === 'failed') {
    return 'failed';
  }

  if (status === 'completed') {
    return 'ready';
  }

  return status;
}

function toDashboardUploadFeedbackFromSubmission(
  submission: DatasetSubmission,
  options: { fileName: string }
): DashboardUploadFeedback {
  return {
    phase: mapSubmissionStatusToUploadPhase(submission.status),
    fileName: submission.fileName || options.fileName,
    submissionStatus: submission.status,
    submissionId: submission.submissionId,
    datasetId: submission.datasetId,
    inferredEffectiveDate: submission.effectiveDate ?? null,
    inferredEffectiveDatetime: submission.effectiveDatetime ?? null,
    validationErrors: submission.validationErrors ?? [],
    error: null,
  };
}

function toDashboardUploadFeedbackFromError(
  error: UIError,
  fileName: string,
  previous: DashboardUploadFeedback | null
): DashboardUploadFeedback {
  const details = error.details;
  const validationErrors = previous?.validationErrors.length
    ? previous.validationErrors
    : extractValidationErrors(details);

  return {
    phase: 'failed',
    fileName: previous?.fileName || fileName,
    submissionStatus: previous?.submissionStatus ?? null,
    submissionId:
      previous?.submissionId ??
      getStringDetail(details, [
        'submissionId',
        'submission_id',
        'existingSubmissionId',
        'existing_submission_id',
      ]),
    datasetId:
      previous?.datasetId ??
      getStringDetail(details, [
        'datasetId',
        'dataset_id',
        'existingDatasetId',
        'existing_dataset_id',
      ]),
    inferredEffectiveDate:
      previous?.inferredEffectiveDate ??
      getStringDetail(details, ['effectiveDate', 'effective_date']),
    inferredEffectiveDatetime:
      previous?.inferredEffectiveDatetime ??
      getStringDetail(details, ['effectiveDatetime', 'effective_datetime']),
    validationErrors,
    error,
  };
}

function isRecoverableUploadRetryError(error: UIError | null) {
  if (!error || error.retryable !== true) {
    return false;
  }

  const status = error.status;
  if (status === 409 || status === 422) {
    return false;
  }

  return status === undefined || status >= 500;
}

function toTerminalSubmissionFailedError(submission: DatasetSubmission) {
  const firstValidationError = submission.validationErrors?.[0];

  return new ServiceError(
    String(firstValidationError?.code ?? 'SUBMISSION_FAILED'),
    String(
      firstValidationError?.message ??
        'Dataset processing failed. Check validation errors and retry.'
    ),
    {
      // Terminal submission failures are backend processing outcomes, not a safe
      // transport-level reupload retry.
      retryable: false,
      details: {
        submissionId: submission.submissionId,
        datasetId: submission.datasetId,
        validationErrors: submission.validationErrors ?? [],
      },
    }
  );
}

function canUsePerformanceApi() {
  return (
    typeof window !== 'undefined' &&
    typeof window.performance !== 'undefined' &&
    typeof window.performance.mark === 'function' &&
    typeof window.performance.measure === 'function'
  );
}

function isDashboardPerfMarksEnabled() {
  return process.env.NODE_ENV === 'development';
}

function startPerformanceMeasurement(metricName: string) {
  if (!isDashboardPerfMarksEnabled() || !canUsePerformanceApi()) {
    return () => {};
  }

  const nonce = `${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const startMark = `${metricName}:start:${nonce}`;
  const endMark = `${metricName}:end:${nonce}`;

  window.performance.mark(startMark);

  return () => {
    window.performance.mark(endMark);
    window.performance.measure(metricName, startMark, endMark);
    window.performance.clearMarks(startMark);
    window.performance.clearMarks(endMark);
  };
}

export function useDashboardMetricsModel() {
  const { rawDateParam, dateParam, setDateParam } = useDashboardDateParam();
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [migrationSemester, setMigrationSemester] = useState<
    string | undefined
  >(undefined);
  const { filters: majorsFilters, setFilters: setMajorsFilters } =
    useMajorsFiltersParam();
  const [forecastHorizon, setForecastHorizon] = useState(
    DEFAULT_FORECAST_HORIZON
  );

  const [datasetState, setDatasetState] = useState<
    AsyncResourceState<DatasetSummary>
  >({
    data: null,
    loading: true,
    error: null,
  });
  const [snapshotsState, setSnapshotsState] = useState<
    AsyncResourceState<SnapshotSummary[]>
  >(initialAsyncResourceState);
  const [overviewState, setOverviewState] = useState<
    AsyncResourceState<DatasetOverviewResponse>
  >(initialAsyncResourceState);
  const [majorsState, setMajorsState] = useState<
    AsyncResourceState<MajorsAnalyticsResponse>
  >(initialAsyncResourceState);
  const [unfilteredMajorsState, setUnfilteredMajorsState] = useState<
    AsyncResourceState<MajorsAnalyticsResponse>
  >(initialAsyncResourceState);
  const [migrationState, setMigrationState] = useState<
    AsyncResourceState<MigrationAnalyticsResponse>
  >(initialAsyncResourceState);
  const [forecastsState, setForecastsState] = useState<
    AsyncResourceState<ForecastsAnalyticsResponse>
  >(initialAsyncResourceState);
  const [forecastRebuildState, setForecastRebuildState] = useState<{
    loading: boolean;
    error: UIError | null;
    job: SnapshotForecastRebuildJobResponse | null;
  }>({
    loading: false,
    error: null,
    job: null,
  });
  const [readModelState, setReadModelState] = useState<DashboardReadModelState>(
    {
      kind: 'ready',
    }
  );

  const [uploadState, setUploadState] = useState<{
    loading: boolean;
    error: UIError | null;
    feedback: DashboardUploadFeedback | null;
    lastFile: File | null;
  }>({
    loading: false,
    error: null,
    feedback: null,
    lastFile: null,
  });
  const [readModelPollingTimedOut, setReadModelPollingTimedOut] =
    useState(false);

  const inFlightByKeyRef = useRef(new Map<string, Promise<unknown>>());
  const uploadControllerRef = useRef<AbortController | null>(null);
  const bootstrapMeasureStopRef = useRef<(() => void) | null>(null);
  const bootstrapMeasuredRef = useRef(false);

  const runDeduped = useCallback(
    async <T>(key: string, request: () => Promise<T>): Promise<T> => {
      const existing = inFlightByKeyRef.current.get(key) as
        | Promise<T>
        | undefined;
      if (existing) {
        return existing;
      }

      const nextPromise = request().finally(() => {
        if (inFlightByKeyRef.current.get(key) === nextPromise) {
          inFlightByKeyRef.current.delete(key);
        }
      });

      inFlightByKeyRef.current.set(key, nextPromise);
      return nextPromise;
    },
    []
  );

  const applyReadModelState = useCallback(
    (nextState: DashboardReadModelState) => {
      setReadModelState((currentState) => {
        if (shouldRetainCurrentReadModelState(currentState, nextState)) {
          return currentState;
        }

        return nextState;
      });
    },
    []
  );

  const pollSubmissionUntilTerminal = useCallback(
    async (
      submissionId: string,
      signal?: AbortSignal,
      onSubmissionUpdate?: (submission: DatasetSubmission) => void
    ): Promise<DatasetSubmission> => {
      const startedAt = Date.now();
      let pollAttempt = 0;

      while (true) {
        const submission = await getDatasetSubmissionStatus(submissionId, {
          signal,
        });
        onSubmissionUpdate?.(submission);

        if (
          submission.status === 'completed' ||
          submission.status === 'failed'
        ) {
          return submission;
        }

        if (Date.now() - startedAt >= SUBMISSION_POLL_TIMEOUT_MS) {
          throw new ServiceError(
            'SUBMISSION_POLL_TIMEOUT',
            'Dataset processing timed out while polling submission status.',
            true
          );
        }

        await delay(getSubmissionPollDelayMs(pollAttempt), signal);
        pollAttempt += 1;
      }
    },
    []
  );

  const loadDataset = useCallback(
    async (signal?: AbortSignal): Promise<DatasetSummary | null> => {
      const stopMeasure = startPerformanceMeasurement(
        'dashboard:dataset:active:load'
      );
      setDatasetState((previous) => ({
        ...previous,
        loading: true,
        error: null,
      }));

      try {
        const dataset = await runDeduped('dataset:active', () =>
          getActiveDataset({ signal })
        );

        setDatasetState({
          data: dataset,
          loading: false,
          error: null,
        });
        applyReadModelState(
          dataset
            ? getDashboardReadModelStateFromDataset(dataset)
            : {
                kind: 'ready',
              }
        );

        return dataset;
      } catch (error) {
        if (isAbortedRequest(error)) {
          return null;
        }

        if (isActiveDatasetNotFound(error)) {
          setDatasetState({
            data: null,
            loading: false,
            error: null,
          });
          applyReadModelState({
            kind: 'ready',
          });
          return null;
        }

        setDatasetState({
          data: null,
          loading: false,
          error: toUIError(error, 'Unable to load active dataset state.'),
        });
        applyReadModelState({
          kind: 'ready',
        });
        return null;
      } finally {
        stopMeasure();
      }
    },
    [applyReadModelState, runDeduped]
  );

  const fetchAllReadySnapshots = useCallback(
    async (signal?: AbortSignal): Promise<SnapshotSummary[]> => {
      const items: SnapshotSummary[] = [];
      let page = 1;

      while (true) {
        const response = await listSnapshots({
          page,
          pageSize: SNAPSHOTS_PAGE_SIZE,
          status: 'ready',
          signal,
        });

        items.push(...response.items);

        if (response.items.length === 0 || items.length >= response.total) {
          return items;
        }

        page += 1;
      }
    },
    []
  );

  const loadSnapshotsCatalog = useCallback(
    async (signal?: AbortSignal): Promise<SnapshotSummary[] | null> => {
      const stopMeasure = startPerformanceMeasurement(
        'dashboard:snapshots:load'
      );
      setSnapshotsState((previous) => ({
        ...previous,
        loading: true,
        error: null,
      }));

      try {
        const snapshots = await runDeduped('snapshots:ready:all', () =>
          fetchAllReadySnapshots(signal)
        );

        setSnapshotsState({
          data: snapshots,
          loading: false,
          error: null,
        });

        return snapshots;
      } catch (error) {
        if (isAbortedRequest(error)) {
          return null;
        }

        setSnapshotsState({
          data: null,
          loading: false,
          error: toUIError(error, 'Unable to load available snapshot dates.'),
        });

        return null;
      } finally {
        stopMeasure();
      }
    },
    [fetchAllReadySnapshots, runDeduped]
  );

  interface LoadDashboardResourceOptions<T> {
    datasetId: string;
    requestKey: string;
    measureKey: string;
    fallbackMessage: string;
    setResourceState: AsyncResourceStateSetter<T>;
    request: () => Promise<T>;
    normalizeError?: (error: UIError) => UIError;
  }

  const loadDashboardResource = useCallback(
    async <T>({
      datasetId,
      requestKey,
      measureKey,
      fallbackMessage,
      setResourceState,
      request,
      normalizeError,
    }: LoadDashboardResourceOptions<T>) => {
      const stopMeasure = startPerformanceMeasurement(measureKey);
      setResourceState((previous) => ({
        ...previous,
        loading: true,
        error: null,
      }));

      try {
        const data = await runDeduped(requestKey, request);

        setResourceState({
          data,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (isAbortedRequest(error)) {
          return;
        }

        const nextReadModelState = getDashboardReadModelStateFromError(
          error,
          datasetId
        );
        if (nextReadModelState) {
          applyReadModelState(nextReadModelState);
          resetAsyncResourceState(setResourceState);
          return;
        }

        const uiError = toUIError(error, fallbackMessage);
        setResourceState({
          data: null,
          loading: false,
          error: normalizeError ? normalizeError(uiError) : uiError,
        });
      } finally {
        stopMeasure();
      }
    },
    [applyReadModelState, runDeduped]
  );

  const loadOverview = useCallback(
    async (
      datasetId: string | undefined,
      snapshotId: string | undefined,
      signal?: AbortSignal
    ) => {
      if (!datasetId) {
        resetAsyncResourceState(setOverviewState);
        return;
      }

      await loadDashboardResource({
        datasetId,
        requestKey: `overview:${datasetId}:${snapshotId ?? 'none'}`,
        measureKey: 'dashboard:panel:overview:load',
        fallbackMessage: 'Unable to load overview metrics.',
        setResourceState: setOverviewState,
        request: () => getDatasetOverview(datasetId, { signal }),
      });
    },
    [loadDashboardResource]
  );

  const loadMajors = useCallback(
    async (
      datasetId: string | undefined,
      snapshotId: string | undefined,
      filters: MajorsFilterParams,
      signal?: AbortSignal
    ) => {
      if (!datasetId) {
        resetAsyncResourceState(setMajorsState);
        return;
      }

      const filterKey = [
        filters.academicPeriod ?? 'all',
        filters.school ?? 'all',
        filters.studentType ?? 'all',
      ].join(':');

      await loadDashboardResource({
        datasetId,
        requestKey: `majors:${datasetId}:${snapshotId ?? 'none'}:${filterKey}`,
        measureKey: 'dashboard:panel:majors:load',
        fallbackMessage: 'Unable to load majors analytics.',
        setResourceState: setMajorsState,
        request: () => getMajorsAnalytics(datasetId, { filters, signal }),
      });
    },
    [loadDashboardResource]
  );

  const loadUnfilteredMajors = useCallback(
    async (
      datasetId: string | undefined,
      snapshotId: string | undefined,
      signal?: AbortSignal
    ) => {
      if (!datasetId) {
        resetAsyncResourceState(setUnfilteredMajorsState);
        return;
      }

      await loadDashboardResource({
        datasetId,
        requestKey: `majors-unfiltered:${datasetId}:${snapshotId ?? 'none'}`,
        measureKey: 'dashboard:panel:majors-unfiltered:load',
        fallbackMessage: 'Unable to load majors filter options.',
        setResourceState: setUnfilteredMajorsState,
        request: () => getMajorsAnalytics(datasetId, { signal }),
      });
    },
    [loadDashboardResource]
  );

  const loadMigration = useCallback(
    async (
      datasetId: string | undefined,
      snapshotId: string | undefined,
      semester: string | undefined,
      signal?: AbortSignal
    ) => {
      if (!datasetId) {
        resetAsyncResourceState(setMigrationState);
        return;
      }

      await loadDashboardResource({
        datasetId,
        requestKey: `migration:${datasetId}:${snapshotId ?? 'none'}:${semester ?? 'all'}`,
        measureKey: 'dashboard:panel:migration:load',
        fallbackMessage: 'Unable to load migration analytics.',
        setResourceState: setMigrationState,
        request: () =>
          getMigrationAnalytics(datasetId, {
            semester,
            signal,
          }),
      });
    },
    [loadDashboardResource]
  );

  const loadForecasts = useCallback(
    async (
      datasetId: string | undefined,
      snapshotId: string | undefined,
      horizon: number,
      signal?: AbortSignal
    ) => {
      if (!datasetId) {
        resetAsyncResourceState(setForecastsState);
        return;
      }

      await loadDashboardResource({
        datasetId,
        requestKey: `forecasts:${datasetId}:${snapshotId ?? 'none'}:${horizon}`,
        measureKey: 'dashboard:panel:forecasts:load',
        fallbackMessage: 'Unable to load forecast analytics.',
        setResourceState: setForecastsState,
        request: () =>
          getForecastsAnalytics(datasetId, {
            horizon,
            signal,
          }),
        normalizeError: (uiError) =>
          uiError.code === 'NEEDS_REBUILD'
            ? {
                ...uiError,
                message:
                  'Forecasts are not ready yet for this dataset. Rebuild is required before forecast analytics can be shown.',
              }
            : uiError,
      });
    },
    [loadDashboardResource]
  );

  const refreshAnalyticsResources = useCallback(
    async (
      options: {
        datasetId: string;
        snapshotId?: string | null;
      },
      signal?: AbortSignal
    ) => {
      await Promise.all([
        loadOverview(
          options.datasetId,
          options.snapshotId ?? undefined,
          signal
        ),
        loadMajors(
          options.datasetId,
          options.snapshotId ?? undefined,
          majorsFilters,
          signal
        ),
        loadUnfilteredMajors(
          options.datasetId,
          options.snapshotId ?? undefined,
          signal
        ),
        loadMigration(
          options.datasetId,
          options.snapshotId ?? undefined,
          migrationSemester,
          signal
        ),
        loadForecasts(
          options.datasetId,
          options.snapshotId ?? undefined,
          forecastHorizon,
          signal
        ),
      ]);
    },
    [
      forecastHorizon,
      loadForecasts,
      loadMajors,
      loadMigration,
      loadOverview,
      loadUnfilteredMajors,
      majorsFilters,
      migrationSemester,
    ]
  );

  const activeDatasetId = datasetState.data?.datasetId;
  const snapshotCatalogLoaded =
    !snapshotsState.loading && snapshotsState.data !== null;
  const snapshotItems = snapshotsState.data ?? EMPTY_SNAPSHOT_ITEMS;
  const hasInvalidDateParamFormat = rawDateParam !== null && dateParam === null;
  const latestSnapshotDateSelection = useMemo(
    () => resolveSnapshotDateSelection(snapshotItems, null),
    [snapshotItems]
  );
  const snapshotDateSelection: SnapshotDateSelection = useMemo(
    () =>
      hasInvalidDateParamFormat
        ? {
            ...latestSnapshotDateSelection,
            selectedSnapshot: null,
          }
        : resolveSnapshotDateSelection(snapshotItems, dateParam),
    [
      dateParam,
      hasInvalidDateParamFormat,
      latestSnapshotDateSelection,
      snapshotItems,
    ]
  );
  const latestSelectableSnapshot =
    snapshotDateSelection.latestSelectableSnapshot;
  const selectedSnapshot = snapshotDateSelection.selectedSnapshot;
  const shouldUseSnapshotSelection =
    snapshotCatalogLoaded && snapshotsState.error === null;
  const requestedDateUnavailable =
    shouldUseSnapshotSelection &&
    rawDateParam !== null &&
    selectedSnapshot === null
      ? rawDateParam
      : null;
  const selectedDate = useMemo(() => {
    if (selectedSnapshot) {
      return parseLocalDateFromDateParam(selectedSnapshot.effectiveDate);
    }
    if (rawDateParam) {
      return parseLocalDateFromDateParam(rawDateParam);
    }
    return null;
  }, [rawDateParam, selectedSnapshot]);
  const defaultDateHydrationPending =
    shouldUseSnapshotSelection &&
    rawDateParam === null &&
    latestSelectableSnapshot !== null;
  const analyticsDatasetId = !activeDatasetId
    ? undefined
    : shouldUseSnapshotSelection
      ? defaultDateHydrationPending
        ? undefined
        : (selectedSnapshot?.datasetId ?? undefined)
      : snapshotsState.error
        ? activeDatasetId
        : undefined;
  const analyticsSnapshotId =
    shouldUseSnapshotSelection && analyticsDatasetId
      ? selectedSnapshot?.snapshotId
      : undefined;
  const selectedSnapshotId = selectedSnapshot?.snapshotId ?? null;
  // MVP1 no-auth decision: rebuild controls are gated to the non-public admin
  // console route, not the main dashboard page.
  const canRebuildForecasts = false;

  useEffect(() => {
    setForecastRebuildState({
      loading: false,
      error: null,
      job: null,
    });
  }, [analyticsDatasetId, analyticsSnapshotId]);

  const setSelectedDate = useCallback(
    (date: Date) => {
      setDateParam(formatDateParamValue(date), {
        mode: 'push',
      });
    },
    [setDateParam]
  );

  const buildSnapshotRefreshTarget = useCallback(
    (
      snapshots: SnapshotSummary[] | null,
      fallbackDatasetId: string
    ): { datasetId: string; snapshotId?: string | null } | null => {
      if (rawDateParam !== null && dateParam === null) {
        return null;
      }

      if (snapshots === null) {
        return {
          datasetId: fallbackDatasetId,
        };
      }

      const selection = resolveSnapshotDateSelection(snapshots, dateParam);
      const snapshotToUse =
        rawDateParam !== null
          ? selection.selectedSnapshot
          : selection.latestSelectableSnapshot;

      if (!snapshotToUse?.datasetId) {
        return rawDateParam === null
          ? {
              datasetId: fallbackDatasetId,
            }
          : null;
      }

      return {
        datasetId: snapshotToUse.datasetId,
        snapshotId: snapshotToUse.snapshotId,
      };
    },
    [dateParam, rawDateParam]
  );

  const refreshReadModelStatus = useCallback(
    async (datasetId: string, signal?: AbortSignal) => {
      const latestDataset = await runDeduped(
        `dataset:detail:${datasetId}`,
        () => getDatasetById(datasetId, { signal })
      );

      setDatasetState((previous) => ({
        ...previous,
        data: latestDataset,
        loading: false,
        error: null,
      }));

      if (latestDataset.status === 'ready') {
        applyReadModelState({
          kind: 'ready',
        });
        const refreshedSnapshots = await loadSnapshotsCatalog(signal);
        // Polling cleanup runs when readModelState flips to "ready"; don't let it abort
        // the one-time analytics refresh that hydrates the panels for the ready state.
        const refreshTarget = buildSnapshotRefreshTarget(
          refreshedSnapshots,
          latestDataset.datasetId
        );

        if (refreshTarget) {
          await refreshAnalyticsResources(refreshTarget);
        }
        return;
      }

      if (latestDataset.status === 'failed') {
        applyReadModelState({
          kind: 'failed',
          datasetId: latestDataset.datasetId,
          status: latestDataset.status,
          error: createDatasetFailedError(latestDataset.datasetId),
        });
        return;
      }

      applyReadModelState({
        kind: 'processing',
        datasetId: latestDataset.datasetId,
        status: latestDataset.status,
      });
    },
    [
      applyReadModelState,
      buildSnapshotRefreshTarget,
      loadSnapshotsCatalog,
      refreshAnalyticsResources,
      runDeduped,
    ]
  );

  const retryReadModelState = useCallback(async () => {
    const datasetId =
      readModelState.kind === 'ready'
        ? activeDatasetId
        : readModelState.datasetId;

    if (!datasetId) {
      return;
    }

    try {
      setReadModelPollingTimedOut(false);
      await refreshReadModelStatus(datasetId);
    } catch (error) {
      if (isAbortedRequest(error)) {
        return;
      }
    }
  }, [activeDatasetId, readModelState, refreshReadModelStatus]);

  const handleDatasetUpload = useCallback(
    async (file: File) => {
      uploadControllerRef.current?.abort();
      const uploadController = new AbortController();
      uploadControllerRef.current = uploadController;
      let completedSubmission: DatasetSubmission | null = null;

      setUploadState({
        loading: true,
        error: null,
        feedback: null,
        lastFile: file,
      });

      try {
        const startedSubmission = await createDatasetSubmission(
          {
            file,
            activateOnSuccess: true,
          },
          {
            signal: uploadController.signal,
          }
        );

        setUploadState((previous) => ({
          ...previous,
          loading: true,
          error: null,
          feedback: toDashboardUploadFeedbackFromSubmission(startedSubmission, {
            fileName: file.name,
          }),
        }));

        const terminalSubmission = await pollSubmissionUntilTerminal(
          startedSubmission.submissionId,
          uploadController.signal,
          (submission) => {
            setUploadState((previous) => ({
              ...previous,
              loading: true,
              error: null,
              feedback: toDashboardUploadFeedbackFromSubmission(submission, {
                fileName: file.name,
              }),
            }));
          }
        );

        if (terminalSubmission.status === 'failed') {
          throw toTerminalSubmissionFailedError(terminalSubmission);
        }

        completedSubmission = terminalSubmission;
        const refreshedDataset = await loadDataset(uploadController.signal);
        const refreshedDatasetId =
          refreshedDataset?.datasetId ?? terminalSubmission.datasetId;
        const refreshedSnapshots = await loadSnapshotsCatalog(
          uploadController.signal
        );

        const refreshTarget = buildSnapshotRefreshTarget(
          refreshedSnapshots,
          refreshedDatasetId
        );

        if (refreshTarget) {
          await refreshAnalyticsResources(
            refreshTarget,
            uploadController.signal
          );
        }

        setUploadState((previous) => ({
          ...previous,
          loading: false,
          error: null,
          lastFile: null,
          feedback: toDashboardUploadFeedbackFromSubmission(
            terminalSubmission,
            {
              fileName: file.name,
            }
          ),
        }));
      } catch (error) {
        if (isAbortedRequest(error)) {
          return;
        }

        const isPostUploadRefreshFailure = completedSubmission !== null;
        const uiErrorBase = toUIError(
          error,
          isPostUploadRefreshFailure
            ? `Upload completed, but dashboard refresh failed for "${file.name}". Use dashboard retry actions to refresh data.`
            : `Unable to upload "${file.name}".`
        );
        const uiError = isPostUploadRefreshFailure
          ? {
              ...uiErrorBase,
              retryable: false,
              message: `Upload completed, but dashboard refresh failed for "${file.name}". ${uiErrorBase.message}`,
            }
          : uiErrorBase;
        if (completedSubmission !== null) {
          const successfulSubmission = completedSubmission;
          setUploadState((previous) => ({
            ...previous,
            loading: false,
            error: uiError,
            lastFile: null,
            feedback: toDashboardUploadFeedbackFromSubmission(
              successfulSubmission,
              {
                fileName: file.name,
              }
            ),
          }));
        } else {
          setUploadState((previous) => ({
            ...previous,
            loading: false,
            error: uiError,
            lastFile: previous.lastFile,
            feedback: toDashboardUploadFeedbackFromError(
              uiError,
              file.name,
              previous.feedback
            ),
          }));
        }
      } finally {
        if (uploadControllerRef.current === uploadController) {
          uploadControllerRef.current = null;
        }
      }
    },
    [
      buildSnapshotRefreshTarget,
      loadDataset,
      loadSnapshotsCatalog,
      pollSubmissionUntilTerminal,
      refreshAnalyticsResources,
    ]
  );

  const retryDatasetUpload = useCallback(() => {
    if (
      uploadState.loading ||
      !uploadState.lastFile ||
      !isRecoverableUploadRetryError(uploadState.error)
    ) {
      return;
    }

    void handleDatasetUpload(uploadState.lastFile);
  }, [
    handleDatasetUpload,
    uploadState.error,
    uploadState.lastFile,
    uploadState.loading,
  ]);

  useEffect(() => {
    bootstrapMeasureStopRef.current = startPerformanceMeasurement(
      'dashboard:bootstrap'
    );

    return () => {
      bootstrapMeasureStopRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (datasetState.loading || bootstrapMeasuredRef.current) {
      return;
    }

    bootstrapMeasuredRef.current = true;
    bootstrapMeasureStopRef.current?.();
    bootstrapMeasureStopRef.current = null;
  }, [datasetState.loading]);

  useEffect(() => {
    const controller = new AbortController();
    void loadDataset(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadDataset]);

  useEffect(() => {
    const controller = new AbortController();
    void loadSnapshotsCatalog(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadSnapshotsCatalog]);

  useEffect(() => {
    if (!snapshotCatalogLoaded || snapshotsState.error) {
      return;
    }

    if (rawDateParam !== null) {
      return;
    }

    if (!latestSelectableSnapshot) {
      return;
    }

    setDateParam(latestSelectableSnapshot.effectiveDate, {
      mode: 'replace',
    });
  }, [
    latestSelectableSnapshot,
    rawDateParam,
    setDateParam,
    snapshotCatalogLoaded,
    snapshotsState.error,
  ]);

  const processingDatasetId =
    readModelState.kind === 'processing' ? readModelState.datasetId : null;

  useEffect(() => {
    if (!processingDatasetId) {
      return;
    }

    setReadModelPollingTimedOut(false);
    const controller = new AbortController();
    let stopped = false;
    const startedAtMs = Date.now();
    let timeoutId: number | null = null;

    const stopPolling = (reason: 'timeout' | 'cleanup') => {
      if (stopped) {
        return;
      }

      stopped = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      controller.abort();
      if (reason === 'timeout') {
        setReadModelPollingTimedOut(true);
      }
    };

    const pollDatasetStatus = async () => {
      const elapsedMs = Date.now() - startedAtMs;
      if (stopped || elapsedMs >= DATASET_STATUS_POLL_MAX_DURATION_MS) {
        if (!stopped && elapsedMs >= DATASET_STATUS_POLL_MAX_DURATION_MS) {
          stopPolling('timeout');
        }
        return;
      }

      try {
        await refreshReadModelStatus(processingDatasetId, controller.signal);
      } catch (error) {
        if (isAbortedRequest(error)) {
          return;
        }
      } finally {
        if (stopped) {
          return;
        }

        if (Date.now() - startedAtMs >= DATASET_STATUS_POLL_MAX_DURATION_MS) {
          stopPolling('timeout');
          return;
        }

        timeoutId = window.setTimeout(() => {
          void pollDatasetStatus();
        }, DATASET_STATUS_POLL_INTERVAL_MS);
      }
    };

    void pollDatasetStatus();

    return () => {
      stopPolling('cleanup');
    };
  }, [processingDatasetId, refreshReadModelStatus]);

  useEffect(() => {
    const controller = new AbortController();
    void loadOverview(
      analyticsDatasetId,
      analyticsSnapshotId,
      controller.signal
    );

    return () => {
      controller.abort();
    };
  }, [analyticsDatasetId, analyticsSnapshotId, loadOverview]);

  useEffect(() => {
    const controller = new AbortController();
    void loadMajors(
      analyticsDatasetId,
      analyticsSnapshotId,
      majorsFilters,
      controller.signal
    );

    return () => {
      controller.abort();
    };
  }, [analyticsDatasetId, analyticsSnapshotId, loadMajors, majorsFilters]);

  useEffect(() => {
    const controller = new AbortController();
    void loadUnfilteredMajors(
      analyticsDatasetId,
      analyticsSnapshotId,
      controller.signal
    );

    return () => {
      controller.abort();
    };
  }, [analyticsDatasetId, analyticsSnapshotId, loadUnfilteredMajors]);

  useEffect(() => {
    const controller = new AbortController();
    void loadMigration(
      analyticsDatasetId,
      analyticsSnapshotId,
      migrationSemester,
      controller.signal
    );

    return () => {
      controller.abort();
    };
  }, [
    analyticsDatasetId,
    analyticsSnapshotId,
    loadMigration,
    migrationSemester,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    void loadForecasts(
      analyticsDatasetId,
      analyticsSnapshotId,
      forecastHorizon,
      controller.signal
    );

    return () => {
      controller.abort();
    };
  }, [analyticsDatasetId, analyticsSnapshotId, forecastHorizon, loadForecasts]);

  useEffect(() => {
    if (!migrationSemester || !migrationState.data) {
      return;
    }

    if (!migrationState.data.semesters.includes(migrationSemester)) {
      setMigrationSemester(undefined);
    }
  }, [migrationSemester, migrationState.data]);

  const activeMigrationSemester =
    migrationSemester &&
    migrationState.data?.semesters.includes(migrationSemester)
      ? migrationSemester
      : undefined;

  const majorsFilterOptions = useMemo(() => {
    const records = unfilteredMajorsState.data?.analyticsRecords ?? [];
    const semesterTuples: { label: string; year: number; termIndex: number }[] =
      [];
    const seenSemesters = new Set<string>();
    const schools = new Set<string>();
    const studentTypes = new Set<string>();

    const termOrder: Record<string, number> = {
      spring: 1,
      summer: 2,
      fall: 3,
    };

    for (const record of records) {
      if (record.semester) {
        const label = `${record.semester} ${record.year}`;
        if (!seenSemesters.has(label)) {
          seenSemesters.add(label);
          semesterTuples.push({
            label,
            year: record.year,
            termIndex: termOrder[record.semester.toLowerCase()] ?? 0,
          });
        }
      }
      if (record.school) {
        schools.add(record.school);
      }
      if (record.studentType) {
        studentTypes.add(record.studentType);
      }
    }

    semesterTuples.sort((a, b) => {
      if (b.year !== a.year) {
        return b.year - a.year;
      }
      return b.termIndex - a.termIndex;
    });

    return {
      academicPeriodOptions: semesterTuples.map((t) => t.label),
      schoolOptions: Array.from(schools).sort(),
      studentTypeOptions: Array.from(studentTypes).sort(),
    };
  }, [unfilteredMajorsState.data]);

  const dashboardViewState: DashboardViewState = getDashboardViewState(
    datasetState,
    readModelState
  );
  const noDataset = dashboardViewState === 'notFound';
  const readModelError =
    readModelState.kind === 'failed' ? readModelState.error : null;
  const readModelStatus =
    readModelState.kind === 'ready' ? null : readModelState.status;
  const retryDataset = useCallback(() => loadDataset(), [loadDataset]);
  const retryOverview = useCallback(
    () => loadOverview(analyticsDatasetId, analyticsSnapshotId),
    [analyticsDatasetId, analyticsSnapshotId, loadOverview]
  );
  const retryMajors = useCallback(
    () => loadMajors(analyticsDatasetId, analyticsSnapshotId, majorsFilters),
    [analyticsDatasetId, analyticsSnapshotId, loadMajors, majorsFilters]
  );
  const retryMigration = useCallback(
    () =>
      loadMigration(analyticsDatasetId, analyticsSnapshotId, migrationSemester),
    [analyticsDatasetId, analyticsSnapshotId, loadMigration, migrationSemester]
  );
  const retryForecasts = useCallback(
    () =>
      loadForecasts(analyticsDatasetId, analyticsSnapshotId, forecastHorizon),
    [analyticsDatasetId, analyticsSnapshotId, forecastHorizon, loadForecasts]
  );
  const rebuildForecasts = useCallback(async () => {
    if (!analyticsSnapshotId) {
      setForecastRebuildState((previous) => ({
        ...previous,
        loading: false,
        error: {
          code: 'SNAPSHOT_NOT_SELECTED',
          message:
            'Select a snapshot date before rebuilding forecasts for this view.',
          retryable: false,
        },
      }));
      return;
    }

    setForecastRebuildState(() => ({
      loading: true,
      error: null,
      job: null,
    }));

    try {
      const job = await createSnapshotForecastRebuildJob(analyticsSnapshotId);
      setForecastRebuildState({
        loading: false,
        error: null,
        job,
      });
    } catch (error) {
      setForecastRebuildState((previous) => ({
        ...previous,
        loading: false,
        error: toUIError(error, 'Unable to start forecast rebuild.'),
      }));
    }
  }, [analyticsSnapshotId]);
  const availableSnapshotDates = snapshotDateSelection.availableDateValues
    .map((value) => parseLocalDateFromDateParam(value))
    .filter((value): value is Date => value !== null);
  const snapshotDateEmptyState =
    requestedDateUnavailable !== null
      ? {
          title: 'Selected date is unavailable',
          description: `No ready snapshot is available for ${requestedDateUnavailable}. Choose another available date or go to the latest available snapshot.`,
        }
      : shouldUseSnapshotSelection &&
          snapshotDateSelection.availableDateValues.length === 0
        ? {
            title: 'No snapshot dates available',
            description:
              'No ready snapshots are available yet. Upload and process a dataset to populate dashboard dates.',
          }
        : null;
  const canGoToLatestAvailableDate =
    requestedDateUnavailable !== null && latestSelectableSnapshot !== null;
  const goToLatestAvailableDate = useCallback(() => {
    if (!latestSelectableSnapshot) {
      return;
    }

    setDateParam(latestSelectableSnapshot.effectiveDate, {
      mode: 'push',
    });
  }, [latestSelectableSnapshot, setDateParam]);

  return {
    selectedDate,
    setSelectedDate,
    selectedSnapshotId,
    currentDataDate: selectedSnapshot?.effectiveDate ?? null,
    latestAvailableSnapshotDate:
      latestSelectableSnapshot?.effectiveDate ?? null,
    canGoToLatestAvailableDate,
    goToLatestAvailableDate,
    availableSnapshotDates,
    snapshotDatesLoading: snapshotsState.loading,
    snapshotDatesError: snapshotsState.error,
    snapshotDateEmptyState,
    breakdownOpen,
    setBreakdownOpen,
    migrationSemester: activeMigrationSemester,
    setMigrationSemester,
    forecastHorizon,
    setForecastHorizon,
    handleDatasetUpload,
    uploadLoading: uploadState.loading,
    uploadError: uploadState.error,
    uploadFeedback: uploadState.feedback,
    uploadRetryAvailable:
      !uploadState.loading &&
      uploadState.lastFile !== null &&
      isRecoverableUploadRetryError(uploadState.error),
    retryDatasetUpload,
    activeDataset: datasetState.data,
    datasetLoading: datasetState.loading,
    datasetError: datasetState.error,
    noDataset,
    dashboardViewState,
    readModelState: readModelState.kind,
    readModelStatus,
    readModelError,
    readModelPollingTimedOut,
    retryReadModelState,
    retryDataset,
    overviewData: overviewState.data,
    overviewLoading: overviewState.loading,
    overviewError: overviewState.error,
    retryOverview,
    majorsData: majorsState.data,
    majorsLoading: majorsState.loading,
    majorsError: majorsState.error,
    majorsFilters,
    setMajorsFilters,
    majorsFilterOptions,
    retryMajors,
    migrationData: migrationState.data,
    migrationLoading: migrationState.loading,
    migrationError: migrationState.error,
    retryMigration,
    forecastsData: forecastsState.data,
    forecastsLoading: forecastsState.loading,
    forecastsError: forecastsState.error,
    canRebuildForecasts,
    forecastRebuildLoading: forecastRebuildState.loading,
    forecastRebuildError: forecastRebuildState.error,
    forecastRebuildJob: forecastRebuildState.job,
    rebuildForecasts,
    retryForecasts,
  };
}
