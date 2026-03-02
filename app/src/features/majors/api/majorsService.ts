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
    cohortRecords: majorCohortResponse.records.map((record) => ({
      ...record,
      avgGPA: record.avgGPA ?? 0,
      avgCredits: record.avgCredits ?? 0,
    })),
  };
}
