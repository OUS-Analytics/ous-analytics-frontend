import { apiClient } from '@/lib/api/client';
import {
  buildGuardedQuery,
  encodePathSegment,
  toApiPath,
  withDatasetCache,
} from '@/lib/api/service-helpers';
import type {
  MigrationAnalyticsResponse,
  MigrationOptionsResponse,
  MigrationRecordsResponse,
} from '@/lib/api/types';

const MIGRATION_RECORDS_QUERY_ALLOWLIST = [
  'startDate',
  'endDate',
  'academicPeriod',
] as const;

interface GetMigrationAnalyticsOptions {
  semester?: string;
  startDate?: string;
  endDate?: string;
  signal?: AbortSignal;
}

export async function getMigrationAnalytics(
  datasetId: string,
  options: GetMigrationAnalyticsOptions = {}
): Promise<MigrationAnalyticsResponse> {
  const encodedDatasetId = encodePathSegment(datasetId);
  const optionsEndpoint = toApiPath(
    `/datasets/${encodedDatasetId}/migration/options`
  );
  const recordsEndpoint = toApiPath(
    `/datasets/${encodedDatasetId}/migration-records`
  );

  const optionsResponse = await apiClient.get<MigrationOptionsResponse>(
    optionsEndpoint,
    withDatasetCache(datasetId, {
      signal: options.signal,
    })
  );

  const semesters =
    optionsResponse.semesters ?? optionsResponse.academicPeriods ?? [];
  const startDate = options.startDate ?? optionsResponse.minEffectiveDate;
  const endDate = options.endDate ?? optionsResponse.maxEffectiveDate;

  if (!startDate || !endDate) {
    return {
      datasetId,
      semesters,
      records: [],
    };
  }

  const [queryStartDate, queryEndDate] =
    startDate <= endDate ? [startDate, endDate] : [endDate, startDate];

  const recordsResponse = await apiClient.get<MigrationRecordsResponse>(
    recordsEndpoint,
    withDatasetCache(datasetId, {
      query: buildGuardedQuery({
        endpoint: recordsEndpoint,
        params: {
          startDate: queryStartDate,
          endDate: queryEndDate,
          academicPeriod: options.semester,
        },
        allowedKeys: MIGRATION_RECORDS_QUERY_ALLOWLIST,
      }),
      signal: options.signal,
    })
  );

  return {
    datasetId,
    semesters,
    records: recordsResponse.records,
  };
}
