import type {
  DatasetForecastPoint,
  DatasetForecastResponse,
  DatasetOverviewResponse,
  DatasetTrendPoint,
  ForecastDataCoverage,
  ForecastLastObserved,
  ForecastLifecycleError,
  ForecastLifecycleState,
  ForecastRange,
  ForecastModelMetadata,
} from './types';
export type RawDatasetTrendPoint = DatasetTrendPoint;

export type RawDatasetForecastPoint = DatasetForecastPoint;

export type RawDatasetOverviewResponse = Omit<
  DatasetOverviewResponse,
  'trend'
> & {
  trend: RawDatasetTrendPoint[];
};

export type RawDatasetForecastResponse = Omit<
  DatasetForecastResponse,
  'historical' | 'forecast'
> & {
  historical: RawDatasetTrendPoint[];
  forecast: RawDatasetForecastPoint[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRawDatasetTrendPoint(value: unknown): value is RawDatasetTrendPoint {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.period === 'string' &&
    isFiniteNumber(value.year) &&
    isFiniteNumber(value.semester) &&
    isFiniteNumber(value.total) &&
    Number.isInteger(value.semester)
  );
}

function isRawDatasetForecastPoint(
  value: unknown
): value is RawDatasetForecastPoint {
  if (!isRawDatasetTrendPoint(value)) {
    return false;
  }

  const maybeForecastPoint = value as RawDatasetForecastPoint;
  return maybeForecastPoint.isForecasted === true;
}

export function isRawDatasetOverviewResponse(
  value: unknown
): value is RawDatasetOverviewResponse {
  if (!isRecord(value) || !Array.isArray(value.trend)) {
    return false;
  }

  return value.trend.every(isRawDatasetTrendPoint);
}

export function isRawDatasetForecastResponse(
  value: unknown
): value is RawDatasetForecastResponse {
  if (
    !isRecord(value) ||
    !Array.isArray(value.historical) ||
    !Array.isArray(value.forecast)
  ) {
    return false;
  }

  return (
    value.historical.every(isRawDatasetTrendPoint) &&
    value.forecast.every(isRawDatasetForecastPoint)
  );
}

export function normalizeDatasetTrendPoint(
  point: RawDatasetTrendPoint
): DatasetTrendPoint {
  return point;
}

export function normalizeDatasetForecastPoint(
  point: RawDatasetForecastPoint
): DatasetForecastPoint {
  return point;
}

export function normalizeDatasetOverviewResponse(
  response: RawDatasetOverviewResponse
): DatasetOverviewResponse {
  return {
    ...response,
    trend: response.trend.map(normalizeDatasetTrendPoint),
  };
}

export function normalizeDatasetForecastResponse(
  response: RawDatasetForecastResponse
): DatasetForecastResponse {
  const lifecycleState = normalizeForecastLifecycleState(response.state);

  return {
    datasetId: response.datasetId,
    state: lifecycleState,
    methodologySummary:
      typeof response.methodologySummary === 'string'
        ? response.methodologySummary
        : '',
    assumptions: isStringArray(response.assumptions)
      ? response.assumptions
      : [],
    dataCoverage: normalizeForecastDataCoverage(response.dataCoverage),
    fiveYearGrowthPct:
      typeof response.fiveYearGrowthPct === 'number'
        ? response.fiveYearGrowthPct
        : null,
    selectedRange: normalizeForecastRange(response.selectedRange),
    horizonYears:
      typeof response.horizonYears === 'number' &&
      Number.isInteger(response.horizonYears)
        ? response.horizonYears
        : null,
    horizonTerms:
      typeof response.horizonTerms === 'number' &&
      Number.isInteger(response.horizonTerms)
        ? response.horizonTerms
        : null,
    termsPerYear:
      typeof response.termsPerYear === 'number' &&
      Number.isInteger(response.termsPerYear)
        ? response.termsPerYear
        : null,
    lastObserved: normalizeForecastLastObserved(response.lastObserved),
    historical: response.historical.map(normalizeDatasetTrendPoint),
    forecast: response.forecast.map(normalizeDatasetForecastPoint),
    insights: isRecord(response.insights) ? response.insights : null,
    model: normalizeForecastModelMetadata(response.model),
    reason: typeof response.reason === 'string' ? response.reason : null,
    suggestedAction:
      typeof response.suggestedAction === 'string'
        ? response.suggestedAction
        : null,
    error: normalizeForecastLifecycleError(response.error),
  };
}

function normalizeForecastLifecycleState(
  value: unknown
): ForecastLifecycleState {
  return value === 'NEEDS_REBUILD' || value === 'FAILED' ? value : 'READY';
}

function normalizeForecastRange(value: unknown): ForecastRange | null {
  return value === 'short' || value === 'medium' || value === 'long'
    ? value
    : null;
}

function normalizeForecastDataCoverage(
  value: unknown
): ForecastDataCoverage | null {
  if (!isRecord(value)) {
    return null;
  }

  const minAcademicPeriod =
    typeof value.minAcademicPeriod === 'string'
      ? value.minAcademicPeriod
      : null;
  const maxAcademicPeriod =
    typeof value.maxAcademicPeriod === 'string'
      ? value.maxAcademicPeriod
      : null;

  return {
    minAcademicPeriod,
    maxAcademicPeriod,
  };
}

function normalizeForecastLifecycleError(
  value: unknown
): ForecastLifecycleError | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.code !== 'string' || typeof value.message !== 'string') {
    return null;
  }

  const details = isRecord(value.details)
    ? (value.details as Record<string, unknown>)
    : null;

  return {
    code: value.code,
    message: value.message,
    details,
  };
}

function normalizeForecastLastObserved(
  value: unknown
): ForecastLastObserved | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.academicPeriod !== 'string' ||
    !isFiniteNumber(value.studentCount)
  ) {
    return null;
  }

  return {
    academicPeriod: value.academicPeriod,
    studentCount: Math.max(0, Math.round(value.studentCount)),
  };
}

function normalizeForecastModelMetadata(
  value: unknown
): ForecastModelMetadata | null {
  if (!isRecord(value) || typeof value.name !== 'string') {
    return null;
  }

  if (typeof value.dampedTrend !== 'boolean') {
    return null;
  }

  return {
    name: value.name,
    trend: typeof value.trend === 'string' ? value.trend : null,
    seasonal: typeof value.seasonal === 'string' ? value.seasonal : null,
    dampedTrend: value.dampedTrend,
  };
}
