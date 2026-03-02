import { apiClient } from '@/lib/api/client';
import {
  buildGuardedQuery,
  encodePathSegment,
  toApiPath,
  withDatasetCache,
} from '@/lib/api/service-helpers';
import type {
  AnalyticsRecord,
  AnalyticsRecordsResponse,
  MajorCohortApiRecord,
  MajorCohortRecord,
  MajorCohortRecordsResponse,
  MajorsAnalyticsResponse,
} from '@/lib/api/types';

const MAJORS_QUERY_ALLOWLIST = [
  'academicPeriod',
  'school',
  'studentType',
] as const;

export interface MajorsFilterParams {
  academicPeriod?: string;
  school?: string;
  studentType?: string;
}

interface GetMajorsAnalyticsOptions {
  filters?: MajorsFilterParams;
  signal?: AbortSignal;
}

const UNKNOWN_COHORT_KEY = 'UNKNOWN';
const UNKNOWN_COHORT_LABEL = 'Unknown';
const OTHER_COHORT_KEY = 'OTHER';
const OTHER_COHORT_LABEL = 'Other';
const UNKNOWN_COHORT_LABELS = new Set([
  'UNKNOWN',
  'N/A',
  'NA',
  'NONE',
  'NULL',
  'UNSPECIFIED',
]);

function parseCohortYear(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const match = value.match(/\b(19|20)\d{2}\b/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function isUnknownCohortLabel(label: string) {
  const normalizedLabel = label.trim().toUpperCase();
  return UNKNOWN_COHORT_LABELS.has(normalizedLabel);
}

function isOtherCohortLabel(label: string) {
  return label.trim().toUpperCase() === OTHER_COHORT_KEY;
}

function normalizeProvidedCohortKey(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toUpperCase() : '';
}

function buildFallbackCohortKey(label: string) {
  return label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function selectFallbackLabel(
  cohortLabel: string,
  cohortKey: string,
  cohortYear: number | null
) {
  if (cohortLabel !== '') {
    return cohortLabel;
  }

  if (cohortYear !== null) {
    return `FTIC ${cohortYear}`;
  }

  if (cohortKey === UNKNOWN_COHORT_KEY) {
    return UNKNOWN_COHORT_LABEL;
  }

  if (cohortKey === OTHER_COHORT_KEY) {
    return OTHER_COHORT_LABEL;
  }

  return UNKNOWN_COHORT_LABEL;
}

function normalizeMetric(value: number | null | undefined) {
  return typeof value === 'number' ? value : 0;
}

function normalizeCohortRecord(
  record: MajorCohortApiRecord
): MajorCohortRecord {
  const cohortLabel = record.cohort.trim();
  const normalizedCohortKey = normalizeProvidedCohortKey(record.cohortKey);
  const keyYear = parseCohortYear(normalizedCohortKey);
  const labelYear = parseCohortYear(cohortLabel);
  const cohortYear = parseCohortYear(record.cohortYear) ?? keyYear ?? labelYear;
  const avgGPA = normalizeMetric(record.avgGPA);
  const avgCredits = normalizeMetric(record.avgCredits);

  if (normalizedCohortKey !== '') {
    return {
      major: record.major,
      cohort: selectFallbackLabel(
        cohortLabel,
        normalizedCohortKey,
        cohortYear ?? null
      ),
      cohortKey: normalizedCohortKey,
      cohortYear: cohortYear ?? null,
      avgGPA,
      avgCredits,
      studentCount: record.studentCount,
    };
  }

  if (cohortYear !== null) {
    return {
      major: record.major,
      cohort: selectFallbackLabel(
        cohortLabel,
        `FTIC_${cohortYear}`,
        cohortYear
      ),
      cohortKey: `FTIC_${cohortYear}`,
      cohortYear,
      avgGPA,
      avgCredits,
      studentCount: record.studentCount,
    };
  }

  if (cohortLabel === '' || isUnknownCohortLabel(cohortLabel)) {
    return {
      major: record.major,
      cohort: UNKNOWN_COHORT_LABEL,
      cohortKey: UNKNOWN_COHORT_KEY,
      cohortYear: null,
      avgGPA,
      avgCredits,
      studentCount: record.studentCount,
    };
  }

  if (isOtherCohortLabel(cohortLabel)) {
    return {
      major: record.major,
      cohort: cohortLabel,
      cohortKey: OTHER_COHORT_KEY,
      cohortYear: null,
      avgGPA,
      avgCredits,
      studentCount: record.studentCount,
    };
  }

  const fallbackKey = buildFallbackCohortKey(cohortLabel);

  if (fallbackKey === '') {
    return {
      major: record.major,
      cohort: UNKNOWN_COHORT_LABEL,
      cohortKey: UNKNOWN_COHORT_KEY,
      cohortYear: null,
      avgGPA,
      avgCredits,
      studentCount: record.studentCount,
    };
  }

  return {
    major: record.major,
    cohort: cohortLabel,
    cohortKey: fallbackKey,
    cohortYear: null,
    avgGPA,
    avgCredits,
    studentCount: record.studentCount,
  };
}

function buildMajorDistribution(records: AnalyticsRecord[]) {
  const countsByMajor = records.reduce<Record<string, number>>(
    (acc, record) => {
      acc[record.major] = (acc[record.major] ?? 0) + record.count;
      return acc;
    },
    {}
  );

  return Object.entries(countsByMajor)
    .map(([major, count]) => ({ major, count }))
    .sort((left, right) => right.count - left.count);
}

export async function getMajorsAnalytics(
  datasetId: string,
  options: GetMajorsAnalyticsOptions = {}
): Promise<MajorsAnalyticsResponse> {
  const encodedDatasetId = encodePathSegment(datasetId);
  const analyticsEndpoint = toApiPath(
    `/datasets/${encodedDatasetId}/analytics-records`
  );
  const cohortEndpoint = toApiPath(
    `/datasets/${encodedDatasetId}/major-cohort-records`
  );

  const query = buildGuardedQuery({
    endpoint: analyticsEndpoint,
    params: {
      academicPeriod: options.filters?.academicPeriod,
      school: options.filters?.school,
      studentType: options.filters?.studentType,
    },
    allowedKeys: MAJORS_QUERY_ALLOWLIST,
  });

  const [analyticsRecordsResponse, majorCohortResponse] = await Promise.all([
    apiClient.get<AnalyticsRecordsResponse>(
      analyticsEndpoint,
      withDatasetCache(datasetId, {
        query,
        signal: options.signal,
      })
    ),
    apiClient.get<MajorCohortRecordsResponse>(
      cohortEndpoint,
      withDatasetCache(datasetId, {
        query,
        signal: options.signal,
      })
    ),
  ]);

  return {
    datasetId,
    analyticsRecords: analyticsRecordsResponse.records,
    majorDistribution: buildMajorDistribution(analyticsRecordsResponse.records),
    cohortRecords: majorCohortResponse.records.map(normalizeCohortRecord),
  };
}
