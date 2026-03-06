import { apiClient } from '@/lib/api/client';
import { ServiceError } from '@/lib/api/errors';
import {
  isRawDatasetOverviewResponse,
  normalizeDatasetOverviewResponse,
} from '@/lib/api/normalize';
import {
  buildGuardedQuery,
  encodePathSegment,
  toApiPath,
  withDatasetCache,
} from '@/lib/api/service-helpers';
import type { DatasetOverviewResponse } from '@/lib/api/types';

const OVERVIEW_QUERY_ALLOWLIST = [
  'asOfSubmissionId',
  'schemaVersion',
  'includeUndergraduateInsights',
  'includeMajorInsights',
  'includeSchoolInsights',
] as const;
const OVERVIEW_SCHEMA_VERSION = '6';

interface GetDatasetOverviewOptions {
  asOfSubmissionId?: string;
  includeUndergraduateInsights?: boolean;
  includeMajorInsights?: boolean;
  includeSchoolInsights?: boolean;
  signal?: AbortSignal;
}

export async function getDatasetOverview(
  datasetId: string,
  options: GetDatasetOverviewOptions = {}
): Promise<DatasetOverviewResponse> {
  const endpoint = toApiPath(
    `/datasets/${encodePathSegment(datasetId)}/overview`
  );

  const rawResponse = await apiClient.get<unknown>(
    endpoint,
    withDatasetCache(datasetId, {
      query: buildGuardedQuery({
        endpoint,
        params: {
          asOfSubmissionId: options.asOfSubmissionId,
          schemaVersion: OVERVIEW_SCHEMA_VERSION,
          includeUndergraduateInsights:
            options.includeUndergraduateInsights ?? true,
          includeMajorInsights: options.includeMajorInsights ?? true,
          includeSchoolInsights: options.includeSchoolInsights ?? true,
        },
        allowedKeys: OVERVIEW_QUERY_ALLOWLIST,
      }),
      signal: options.signal,
    })
  );

  if (!isRawDatasetOverviewResponse(rawResponse)) {
    throw new ServiceError(
      'INVALID_RESPONSE_SHAPE',
      'Overview response was malformed.',
      {
        retryable: false,
        details: { endpoint, datasetId },
      }
    );
  }

  return normalizeDatasetOverviewResponse(rawResponse);
}
