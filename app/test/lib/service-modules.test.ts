import {
  activateDataset,
  getActiveDataset,
  getDatasetById,
  listDatasets,
} from '@/features/datasets/api/datasetsService';
import { getForecastsAnalytics } from '@/features/forecasts/api/forecastsService';
import { getMajorsAnalytics } from '@/features/majors/api/majorsService';
import { getMigrationAnalytics } from '@/features/migration/api/migrationService';
import { getDatasetOverview } from '@/features/overview/api/overviewService';
import {
  createSnapshotForecastRebuildJob,
  getSnapshotCoverage,
  listSnapshots,
} from '@/features/snapshots/api/snapshotsService';
import {
  createBulkSubmissionJob,
  createDatasetSubmission,
  getBulkSubmissionJobStatus,
  getDatasetSubmissionStatus,
  listSubmissions,
} from '@/features/submissions/api/submissionsService';
import { ApiError, ServiceError } from '@/lib/api/errors';
import { apiClient, clearDatasetResponseCache } from '@/lib/api/client';
import { filterQueryParams } from '@/lib/api/queryGuardrails';
import { installFetchMock, jsonResponse } from '../utils/http';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    postForm: jest.fn(),
  },
  clearDatasetResponseCache: jest.fn(),
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockClearDatasetResponseCache =
  clearDatasetResponseCache as jest.MockedFunction<
    typeof clearDatasetResponseCache
  >;

function withNodeEnv(
  value: string,
  testFn: () => Promise<void> | void
): Promise<void> | void {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = value;

  const cleanup = () => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
      return;
    }

    process.env.NODE_ENV = originalNodeEnv;
  };

  try {
    const maybePromise = testFn();
    if (maybePromise instanceof Promise) {
      return maybePromise.finally(cleanup);
    }
    cleanup();
  } catch (error) {
    cleanup();
    throw error;
  }
}

describe('query guardrails', () => {
  test('filterQueryParams keeps valid non-empty primitive arrays without warning', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await withNodeEnv('development', () => {
        const query = filterQueryParams({
          endpoint: '/api/v1/submissions',
          params: {
            page: 1,
            pageSize: 20,
            tags: ['queued', 'failed'],
          },
          allowedKeys: ['page', 'pageSize', 'tags'],
        });

        expect(query).toEqual({
          page: 1,
          pageSize: 20,
          tags: ['queued', 'failed'],
        });
      });

      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('filterQueryParams omits undefined, null, empty strings, and empty arrays without warning', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await withNodeEnv('development', () => {
        const query = filterQueryParams({
          endpoint: '/api/v1/submissions',
          params: {
            page: 1,
            pageSize: 20,
            status: undefined,
            createdAfter: null,
            createdBefore: '',
            tags: [],
          },
          allowedKeys: [
            'page',
            'pageSize',
            'status',
            'createdAfter',
            'createdBefore',
            'tags',
          ],
        });

        expect(query).toEqual({
          page: 1,
          pageSize: 20,
        });
      });

      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('filterQueryParams drops unknown keys and warns in non-production environments', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await withNodeEnv('development', () => {
        const query = filterQueryParams({
          endpoint: '/api/v1/datasets',
          params: {
            page: 1,
            pageSize: 10,
            limit: 10,
            offset: 20,
          },
          allowedKeys: ['page', 'pageSize'],
        });

        expect(query).toEqual({
          page: 1,
          pageSize: 10,
        });
      });

      const warningMessage = String(warnSpy.mock.calls[0]?.[0]);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warningMessage).toContain('/api/v1/datasets');
      expect(warningMessage).toContain('limit');
      expect(warningMessage).toContain('offset');
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('filterQueryParams drops invalid types and non-finite numbers with warning in non-production environments', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await withNodeEnv('development', () => {
        const query = filterQueryParams({
          endpoint: '/api/v1/submissions',
          params: {
            page: 1,
            pageSize: Number.POSITIVE_INFINITY,
            status: { value: 'failed' },
          },
          allowedKeys: ['page', 'pageSize', 'status'],
        });

        expect(query).toEqual({
          page: 1,
        });
      });

      const warningMessage = String(warnSpy.mock.calls[0]?.[0]);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warningMessage).toContain('/api/v1/submissions');
      expect(warningMessage).toContain('pageSize');
      expect(warningMessage).toContain('status');
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('filterQueryParams drops arrays with invalid entries and warns in non-production environments', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await withNodeEnv('development', () => {
        const query = filterQueryParams({
          endpoint: '/api/v1/submissions',
          params: {
            page: 1,
            tags: ['queued', { bad: true }],
          },
          allowedKeys: ['page', 'tags'],
        });

        expect(query).toEqual({
          page: 1,
        });
      });

      const warningMessage = String(warnSpy.mock.calls[0]?.[0]);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warningMessage).toContain('/api/v1/submissions');
      expect(warningMessage).toContain('tags');
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('filterQueryParams suppresses warning logs in production', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await withNodeEnv('production', () => {
        const query = filterQueryParams({
          endpoint: '/api/v1/submissions',
          params: {
            page: 1,
            pageSize: Number.NaN,
            status: { value: 'failed' },
            limit: 10,
          },
          allowedKeys: ['page', 'pageSize', 'status'],
        });

        expect(query).toEqual({
          page: 1,
        });
      });

      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('wire-level query serialization excludes dropped and omitted params', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const originalFetch = globalThis.fetch;

    try {
      const fetchSpy = installFetchMock();
      fetchSpy.mockResolvedValueOnce(jsonResponse({ items: [] }));

      const { createApiClient } = jest.requireActual(
        '@/lib/api/client'
      ) as typeof import('@/lib/api/client');

      const filteredQuery = filterQueryParams({
        endpoint: '/api/v1/submissions',
        params: {
          page: 1,
          pageSize: 1,
          status: undefined,
          createdAfter: null,
          createdBefore: '',
          tags: [],
          invalidShape: { value: 'bad' },
          invalidNumber: Number.NaN,
          limit: 25,
        },
        allowedKeys: [
          'page',
          'pageSize',
          'status',
          'createdAfter',
          'createdBefore',
          'tags',
          'invalidShape',
          'invalidNumber',
        ],
      });

      const client = createApiClient('http://localhost:8000');
      await client.get('/api/v1/submissions', { query: filteredQuery });

      const raw = String(fetchSpy.mock.calls[0]?.[0]);
      const parsed = new URL(raw);
      expect(`${parsed.origin}${parsed.pathname}`).toBe(
        'http://localhost:8000/api/v1/submissions'
      );
      expect(parsed.searchParams.get('page')).toBe('1');
      expect(parsed.searchParams.get('pageSize')).toBe('1');
      expect([...parsed.searchParams.keys()].sort()).toEqual([
        'page',
        'pageSize',
      ]);
    } finally {
      globalThis.fetch = originalFetch;
      warnSpy.mockRestore();
    }
  });
});

describe('service modules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('datasetsService uses expected endpoints and query defaults', async () => {
    mockApiClient.get
      .mockResolvedValueOnce({
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
      })
      .mockResolvedValueOnce({
        datasetId: 'dataset-1',
        name: 'ready.csv',
        status: 'ready',
        isActive: true,
        createdAt: '2026-02-10T00:00:00Z',
        sourceSubmissionId: 'sub-1',
      })
      .mockResolvedValueOnce({
        datasetId: 'dataset/1',
        name: 'ready.csv',
        status: 'ready',
        isActive: true,
        createdAt: '2026-02-10T00:00:00Z',
        sourceSubmissionId: 'sub-1',
      });
    mockApiClient.put.mockResolvedValueOnce({
      datasetId: 'dataset-1',
      name: 'ready.csv',
      status: 'ready',
      isActive: true,
      createdAt: '2026-02-10T00:00:00Z',
      sourceSubmissionId: 'sub-1',
    });

    await listDatasets();
    await getActiveDataset();
    await getDatasetById('dataset/1');
    await activateDataset('dataset-1');

    expect(mockApiClient.get).toHaveBeenNthCalledWith(1, '/api/v1/datasets', {
      query: { page: 1, pageSize: 20 },
      signal: undefined,
    });
    expect(mockApiClient.get).toHaveBeenNthCalledWith(
      2,
      '/api/v1/datasets/active',
      { signal: undefined }
    );
    expect(mockApiClient.get).toHaveBeenNthCalledWith(
      3,
      '/api/v1/datasets/dataset%2F1',
      {
        signal: undefined,
        datasetCache: { datasetId: 'dataset/1' },
      }
    );
    expect(mockApiClient.put).toHaveBeenCalledWith(
      '/api/v1/datasets/dataset-1/active',
      undefined,
      { signal: undefined }
    );
    expect(mockClearDatasetResponseCache).toHaveBeenCalledTimes(1);
  });

  test('listDatasets normalizes invalid pagination values and warns in non-production environments', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await withNodeEnv('development', async () => {
        await listDatasets({
          page: 0,
          pageSize: -5,
        });
      });

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/datasets', {
        query: {
          page: 1,
          pageSize: 20,
        },
        signal: undefined,
      });
      expect(warnSpy).toHaveBeenCalledTimes(2);
      const warningMessage = String(warnSpy.mock.calls[0]?.[0]);
      expect(warningMessage).toContain('/api/v1/datasets');
      expect(warningMessage).toContain('page');
      expect(String(warnSpy.mock.calls[1]?.[0])).toContain('pageSize');
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('listDatasets keeps valid pagination values without normalization warnings', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      items: [],
      page: 3,
      pageSize: 15,
      total: 0,
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await withNodeEnv('development', async () => {
        await listDatasets({
          page: 3,
          pageSize: 15,
        });
      });

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/datasets', {
        query: {
          page: 3,
          pageSize: 15,
        },
        signal: undefined,
      });
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('listDatasets suppresses pagination normalization warnings in production', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await withNodeEnv('production', async () => {
        await listDatasets({
          page: 0,
          pageSize: -1,
        });
      });

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/datasets', {
        query: {
          page: 1,
          pageSize: 20,
        },
        signal: undefined,
      });
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('getActiveDataset maps ACTIVE_DATASET_NOT_FOUND to null and rethrows other errors', async () => {
    mockApiClient.get.mockRejectedValueOnce(
      new ServiceError(
        'ACTIVE_DATASET_NOT_FOUND',
        'Active dataset not found.',
        false
      )
    );
    await expect(getActiveDataset()).resolves.toBeNull();

    mockApiClient.get.mockRejectedValueOnce(
      new ServiceError('NETWORK_ERROR', 'nope')
    );
    await expect(getActiveDataset()).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });

  test('getActiveDataset treats a generic 404 response as empty first-run state', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      mockApiClient.get.mockRejectedValueOnce(
        new ApiError({
          code: 'HTTP_ERROR',
          message: 'Request failed with status 404.',
          status: 404,
          retryable: false,
        })
      );

      await expect(getActiveDataset()).resolves.toBeNull();
      expect(errSpy).not.toHaveBeenCalled();
    } finally {
      errSpy.mockRestore();
    }
  });

  test('getActiveDataset rethrows generic non-404 HTTP errors', async () => {
    mockApiClient.get.mockRejectedValueOnce(
      new ApiError({
        code: 'HTTP_ERROR',
        message: 'Request failed with status 500.',
        status: 500,
        retryable: true,
      })
    );

    await expect(getActiveDataset()).rejects.toMatchObject({
      status: 500,
      code: 'HTTP_ERROR',
      name: 'ApiError',
    });
  });

  test('getMajorsAnalytics aggregates and normalizes cohort records', async () => {
    mockApiClient.get
      .mockResolvedValueOnce({
        datasetId: 'dataset-1',
        records: [
          {
            year: 2024,
            semester: 'Fall',
            major: 'Biology',
            school: 'Science',
            studentType: 'FTIC',
            count: 3,
          },
          {
            year: 2024,
            semester: 'Fall',
            major: 'Biology',
            school: 'Science',
            studentType: 'Transfer',
            count: 1,
          },
          {
            year: 2024,
            semester: 'Fall',
            major: 'Chemistry',
            school: 'Science',
            studentType: 'FTIC',
            count: 2,
          },
        ],
      })
      .mockResolvedValueOnce({
        datasetId: 'dataset-1',
        records: [
          {
            major: 'Biology',
            cohort: 'FTIC 2024',
            cohortKey: 'FTIC_2024',
            cohortYear: 2024,
            avgGPA: null,
            avgCredits: null,
            studentCount: 4,
          },
          {
            major: 'Chemistry',
            cohort: 'n/a',
            avgGPA: 3.1,
            avgCredits: 15,
            studentCount: 2,
          },
          {
            major: 'Physics',
            cohort: 'Entering Class 2027',
            cohortKey: 'FTIC_2027',
            avgGPA: 3.5,
            avgCredits: 16,
            studentCount: 1,
          },
          {
            major: 'Math',
            cohort: '',
            cohortKey: 'FTIC_2026',
            cohortYear: 2026,
            avgGPA: 3.7,
            avgCredits: 14,
            studentCount: 2,
          },
        ],
      });

    const response = await getMajorsAnalytics('dataset-1');
    expect(response.majorDistribution).toEqual([
      { major: 'Biology', count: 4 },
      { major: 'Chemistry', count: 2 },
    ]);
    expect(response.cohortRecords).toEqual([
      {
        major: 'Biology',
        cohort: 'FTIC 2024',
        cohortKey: 'FTIC_2024',
        cohortYear: 2024,
        avgGPA: 0,
        avgCredits: 0,
        studentCount: 4,
      },
      {
        major: 'Chemistry',
        cohort: 'Unknown',
        cohortKey: 'UNKNOWN',
        cohortYear: null,
        avgGPA: 3.1,
        avgCredits: 15,
        studentCount: 2,
      },
      {
        major: 'Physics',
        cohort: 'Entering Class 2027',
        cohortKey: 'FTIC_2027',
        cohortYear: 2027,
        avgGPA: 3.5,
        avgCredits: 16,
        studentCount: 1,
      },
      {
        major: 'Math',
        cohort: 'FTIC 2026',
        cohortKey: 'FTIC_2026',
        cohortYear: 2026,
        avgGPA: 3.7,
        avgCredits: 14,
        studentCount: 2,
      },
    ]);
  });

  test('getMajorsAnalytics preserves other and custom non-year cohorts with stable keys', async () => {
    mockApiClient.get
      .mockResolvedValueOnce({
        datasetId: 'dataset-1',
        records: [],
      })
      .mockResolvedValueOnce({
        datasetId: 'dataset-1',
        records: [
          {
            major: 'Biology',
            cohort: 'other',
            avgGPA: 3.25,
            avgCredits: 15,
            studentCount: 3,
          },
          {
            major: 'Chemistry',
            cohort: 'Legacy Cohort',
            avgGPA: 3.1,
            avgCredits: 12,
            studentCount: 5,
          },
          {
            major: 'Physics',
            cohort: '***',
            avgGPA: 2.9,
            avgCredits: 11,
            studentCount: 2,
          },
        ],
      });

    const response = await getMajorsAnalytics('dataset-1');

    expect(response.cohortRecords).toEqual([
      {
        major: 'Biology',
        cohort: 'other',
        cohortKey: 'OTHER',
        cohortYear: null,
        avgGPA: 3.25,
        avgCredits: 15,
        studentCount: 3,
      },
      {
        major: 'Chemistry',
        cohort: 'Legacy Cohort',
        cohortKey: 'LEGACY_COHORT',
        cohortYear: null,
        avgGPA: 3.1,
        avgCredits: 12,
        studentCount: 5,
      },
      {
        major: 'Physics',
        cohort: 'Unknown',
        cohortKey: 'UNKNOWN',
        cohortYear: null,
        avgGPA: 2.9,
        avgCredits: 11,
        studentCount: 2,
      },
    ]);
  });

  test('getMajorsAnalytics applies blank-label fallbacks without overriding provided keys', async () => {
    mockApiClient.get
      .mockResolvedValueOnce({
        datasetId: 'dataset-1',
        records: [],
      })
      .mockResolvedValueOnce({
        datasetId: 'dataset-1',
        records: [
          {
            major: 'Biology',
            cohort: '',
            cohortKey: 'UNKNOWN',
            avgGPA: 3.25,
            avgCredits: 15,
            studentCount: 3,
          },
          {
            major: 'Chemistry',
            cohort: '',
            cohortKey: 'OTHER',
            avgGPA: 3.1,
            avgCredits: 12,
            studentCount: 5,
          },
          {
            major: 'Physics',
            cohort: '',
            cohortKey: 'LEGACY',
            avgGPA: 2.9,
            avgCredits: 11,
            studentCount: 2,
          },
          {
            major: 'Math',
            cohort: '',
            cohortYear: 2028,
            avgGPA: 3.4,
            avgCredits: 14,
            studentCount: 4,
          },
        ],
      });

    const response = await getMajorsAnalytics('dataset-1');

    expect(response.cohortRecords).toEqual([
      {
        major: 'Biology',
        cohort: 'Unknown',
        cohortKey: 'UNKNOWN',
        cohortYear: null,
        avgGPA: 3.25,
        avgCredits: 15,
        studentCount: 3,
      },
      {
        major: 'Chemistry',
        cohort: 'Other',
        cohortKey: 'OTHER',
        cohortYear: null,
        avgGPA: 3.1,
        avgCredits: 12,
        studentCount: 5,
      },
      {
        major: 'Physics',
        cohort: 'Unknown',
        cohortKey: 'LEGACY',
        cohortYear: null,
        avgGPA: 2.9,
        avgCredits: 11,
        studentCount: 2,
      },
      {
        major: 'Math',
        cohort: 'FTIC 2028',
        cohortKey: 'FTIC_2028',
        cohortYear: 2028,
        avgGPA: 3.4,
        avgCredits: 14,
        studentCount: 4,
      },
    ]);
  });

  test('getMigrationAnalytics combines options and records with semester filter', async () => {
    mockApiClient.get
      .mockResolvedValueOnce({
        datasetId: 'dataset-1',
        minEffectiveDate: '2026-01-01',
        maxEffectiveDate: '2026-05-01',
        academicPeriods: ['Fall 2024'],
        semesters: ['Fall 2024'],
      })
      .mockResolvedValueOnce({
        datasetId: 'dataset-1',
        records: [
          { fromMajor: 'A', toMajor: 'B', semester: 'Fall 2024', count: 1 },
        ],
      });

    const response = await getMigrationAnalytics('dataset-1', {
      semester: 'Fall 2024',
    });

    expect(response.semesters).toEqual(['Fall 2024']);
    expect(response.records).toHaveLength(1);
    expect(mockApiClient.get).toHaveBeenNthCalledWith(
      2,
      '/api/v1/datasets/dataset-1/migration-records',
      {
        query: {
          startDate: '2026-01-01',
          endDate: '2026-05-01',
          academicPeriod: 'Fall 2024',
        },
        signal: undefined,
        datasetCache: { datasetId: 'dataset-1' },
      }
    );
  });

  test('getMigrationAnalytics supports default options argument', async () => {
    mockApiClient.get
      .mockResolvedValueOnce({
        datasetId: 'dataset-1',
        minEffectiveDate: '2026-01-01',
        maxEffectiveDate: '2026-05-01',
        academicPeriods: [],
        semesters: [],
      })
      .mockResolvedValueOnce({
        datasetId: 'dataset-1',
        records: [],
      });

    await getMigrationAnalytics('dataset-1');

    expect(mockApiClient.get).toHaveBeenNthCalledWith(
      2,
      '/api/v1/datasets/dataset-1/migration-records',
      {
        query: {
          startDate: '2026-01-01',
          endDate: '2026-05-01',
        },
        signal: undefined,
        datasetCache: { datasetId: 'dataset-1' },
      }
    );
  });

  test('getMigrationAnalytics supports explicit semester range overrides', async () => {
    mockApiClient.get
      .mockResolvedValueOnce({
        datasetId: 'dataset-1',
        minEffectiveDate: '2026-01-01',
        maxEffectiveDate: '2026-05-01',
        academicPeriods: ['Fall 2024', 'Spring 2025'],
        semesters: ['Fall 2024', 'Spring 2025'],
      })
      .mockResolvedValueOnce({
        datasetId: 'dataset-1',
        records: [],
      });

    await getMigrationAnalytics('dataset-1', {
      startDate: '2026-04-01',
      endDate: '2026-02-01',
    });

    expect(mockApiClient.get).toHaveBeenNthCalledWith(
      2,
      '/api/v1/datasets/dataset-1/migration-records',
      {
        query: {
          startDate: '2026-02-01',
          endDate: '2026-04-01',
        },
        signal: undefined,
        datasetCache: { datasetId: 'dataset-1' },
      }
    );
  });

  test('getMigrationAnalytics falls back to academicPeriods when semesters are omitted', async () => {
    mockApiClient.get
      .mockResolvedValueOnce({
        datasetId: 'dataset-1',
        minEffectiveDate: '2026-01-01',
        maxEffectiveDate: '2026-05-01',
        academicPeriods: ['Fall 2024', 'Spring 2025'],
      })
      .mockResolvedValueOnce({
        datasetId: 'dataset-1',
        records: [],
      });

    const response = await getMigrationAnalytics('dataset-1');

    expect(response).toEqual({
      datasetId: 'dataset-1',
      semesters: ['Fall 2024', 'Spring 2025'],
      records: [],
    });
  });

  test('getMigrationAnalytics defaults to an empty semester list when options omit both fields', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      datasetId: 'dataset-1',
      minEffectiveDate: null,
      maxEffectiveDate: null,
    });

    const response = await getMigrationAnalytics('dataset-1');

    expect(response).toEqual({
      datasetId: 'dataset-1',
      semesters: [],
      records: [],
    });
  });

  test('getMigrationAnalytics skips migration records when date bounds are unavailable', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      datasetId: 'dataset-1',
      minEffectiveDate: null,
      maxEffectiveDate: null,
      academicPeriods: ['Fall 2024'],
      semesters: ['Fall 2024'],
    });

    const response = await getMigrationAnalytics('dataset-1');

    expect(response).toEqual({
      datasetId: 'dataset-1',
      semesters: ['Fall 2024'],
      records: [],
    });
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
  });

  test('getForecastsAnalytics preserves backend semester values', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      datasetId: 'dataset-1',
      fiveYearGrowthPct: 1.5,
      historical: [{ period: 'Fall 2024', year: 2024, semester: 1, total: 10 }],
      forecast: [
        {
          period: 'Spring 2025',
          year: 2025,
          semester: 2,
          total: 12,
          isForecasted: true,
        },
      ],
      insights: {
        projectedGrowthText: 'a',
        resourcePlanningText: 'b',
        recommendationText: 'c',
      },
    });

    const response = await getForecastsAnalytics('dataset-1');
    expect(response.historical[0]?.semester).toBe(1);
    expect(response.forecast[0]?.semester).toBe(2);
    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/api/v1/datasets/dataset-1/forecasts',
      {
        query: { range: 'medium' },
        signal: undefined,
        datasetCache: { datasetId: 'dataset-1' },
      }
    );
  });

  test('getForecastsAnalytics forwards explicit range when provided', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      datasetId: 'dataset-1',
      historical: [],
      forecast: [],
    });

    await getForecastsAnalytics('dataset-1', { range: 'long' });

    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/api/v1/datasets/dataset-1/forecasts',
      {
        query: { range: 'long' },
        signal: undefined,
        datasetCache: { datasetId: 'dataset-1' },
      }
    );
  });

  test('getForecastsAnalytics forwards asOfDate when provided', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      datasetId: 'dataset-1',
      historical: [],
      forecast: [],
    });

    await getForecastsAnalytics('dataset-1', {
      range: 'medium',
      asOfDate: '2026-03-04',
    });

    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/api/v1/datasets/dataset-1/forecasts',
      {
        query: { range: 'medium', asOfDate: '2026-03-04' },
        signal: undefined,
        datasetCache: { datasetId: 'dataset-1' },
      }
    );
  });

  test('getForecastsAnalytics forwards explicit horizon when range is omitted', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      datasetId: 'dataset-1',
      historical: [],
      forecast: [],
    });

    await getForecastsAnalytics('dataset-1', { horizon: 7 });

    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/api/v1/datasets/dataset-1/forecasts',
      {
        query: { horizon: 7 },
        signal: undefined,
        datasetCache: { datasetId: 'dataset-1' },
      }
    );
  });

  test('getDatasetOverview rejects malformed response payloads', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      datasetId: 'dataset-1',
      trend: 'not-an-array',
    });

    await expect(getDatasetOverview('dataset-1')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE_SHAPE',
      retryable: false,
    });
  });

  test('getForecastsAnalytics rejects malformed response payloads', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      datasetId: 'dataset-1',
      historical: [],
      forecast: [
        {
          period: 'x',
          year: 2024,
          semester: 'Fall',
          total: 1,
          isForecasted: true,
        },
      ],
    });

    await expect(getForecastsAnalytics('dataset-1')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE_SHAPE',
      retryable: false,
    });
  });

  test('listSnapshots forwards page/pageSize and ready status filters', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      items: [
        {
          snapshotId: 'snap-20260211',
          effectiveDate: '2026-02-11',
          effectiveDatetime: '2026-02-11T15:00:00Z',
          createdAt: '2026-02-11T15:01:00Z',
          academicPeriod: 'Spring 2026',
          status: 'ready',
          submissionId: 'sub-1',
          datasetId: 'dataset-1',
        },
      ],
      page: 2,
      pageSize: 50,
      total: 101,
    });

    const response = await listSnapshots({
      page: 2,
      pageSize: 50,
      status: 'ready',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    });

    expect(response.total).toBe(101);
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/snapshots', {
      query: {
        page: 2,
        pageSize: 50,
        status: 'ready',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      },
      signal: undefined,
    });
  });

  test('listSnapshots supports default options', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });

    const response = await listSnapshots();

    expect(response.items).toEqual([]);
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/snapshots', {
      query: {
        page: 1,
        pageSize: 20,
      },
      signal: undefined,
    });
  });

  test('getSnapshotCoverage forwards explicit range query params', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      minEffectiveDate: '2026-01-29',
      maxEffectiveDate: '2026-02-11',
      rangeStartDate: '2026-01-29',
      rangeEndDate: '2026-02-11',
      missingWeekdays: ['2026-02-03'],
      missingWeekdayCount: 1,
    });

    const response = await getSnapshotCoverage({
      startDate: '2026-01-29',
      endDate: '2026-02-11',
    });

    expect(response.missingWeekdayCount).toBe(1);
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/snapshots/coverage', {
      query: {
        startDate: '2026-01-29',
        endDate: '2026-02-11',
      },
      signal: undefined,
    });
  });

  test('getSnapshotCoverage supports calls without an explicit range', async () => {
    const coverageResponse: Awaited<ReturnType<typeof getSnapshotCoverage>> = {
      missingWeekdays: [],
      missingWeekdayCount: 0,
    };
    mockApiClient.get.mockResolvedValueOnce(coverageResponse);

    const response = await getSnapshotCoverage();

    expect(response.missingWeekdayCount).toBe(0);
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/snapshots/coverage', {
      query: {},
      signal: undefined,
    });
  });

  test('createSnapshotForecastRebuildJob posts to snapshot rebuild endpoint', async () => {
    mockApiClient.post.mockResolvedValueOnce({
      jobId: 'fjob-1',
      snapshotId: 'snap-20260211',
      datasetId: 'dataset-1',
      triggerSource: 'manual',
      status: 'queued',
      totalSteps: 3,
      completedSteps: 0,
      createdAt: '2026-02-25T12:00:00Z',
      startedAt: null,
      completedAt: null,
      error: null,
    });

    const response = await createSnapshotForecastRebuildJob('snap-20260211');

    expect(response.jobId).toBe('fjob-1');
    expect(mockApiClient.post).toHaveBeenCalledWith(
      '/api/v1/snapshots/snap-20260211/forecasts/rebuild',
      undefined,
      {
        signal: undefined,
      }
    );
  });

  test('submissionsService handles single submission, status, list, and bulk endpoints', async () => {
    mockApiClient.postForm
      .mockResolvedValueOnce({
        submissionId: 'sub-1',
        datasetId: 'dataset-1',
        status: 'queued',
        fileName: 'latest.csv',
        createdAt: '2026-02-10T00:00:00Z',
        effectiveDate: '2026-02-10',
        effectiveDatetime: '2026-02-10T12:00:00Z',
      })
      .mockResolvedValueOnce({
        jobId: 'job-1',
        status: 'queued',
        totalFiles: 2,
        activateLatest: true,
        continueOnError: true,
        dryRun: false,
        createdAt: '2026-02-10T00:00:00Z',
      });

    mockApiClient.get
      .mockResolvedValueOnce({
        submissionId: 'sub-1',
        datasetId: 'dataset-1',
        status: 'failed',
        fileName: 'latest.csv',
        createdAt: '2026-02-10T00:00:00Z',
        effectiveDate: '2026-02-10',
        effectiveDatetime: '2026-02-10T12:00:00Z',
        completedAt: '2026-02-10T00:02:00Z',
        validationErrors: [{ code: 'VALIDATION_FAILED', message: 'Bad row' }],
      })
      .mockResolvedValueOnce({
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
      })
      .mockResolvedValueOnce({
        jobId: 'job-1',
        status: 'completed',
        totalFiles: 2,
        processedFiles: 2,
        succeededFiles: 2,
        failedFiles: 0,
        activateLatest: true,
        continueOnError: true,
        dryRun: false,
        activatedDatasetId: 'dataset-1',
        createdAt: '2026-02-10T00:00:00Z',
        startedAt: '2026-02-10T00:00:10Z',
        completedAt: '2026-02-10T00:01:00Z',
        results: [],
      });

    const file = new File(['a,b\n1,2'], 'latest.csv', { type: 'text/csv' });
    const created = await createDatasetSubmission({
      file,
      activateOnSuccess: false,
    });
    const status = await getDatasetSubmissionStatus('sub/1');
    await listSubmissions({
      page: 2,
      pageSize: 25,
      status: 'failed',
      createdAfter: '2026-01-01T00:00:00Z',
      createdBefore: '2026-01-31T00:00:00Z',
    });
    await createBulkSubmissionJob({
      files: [file, new File(['x,y\n1,2'], 'next.csv', { type: 'text/csv' })],
      activateLatest: false,
      continueOnError: false,
      dryRun: true,
    });
    const job = await getBulkSubmissionJobStatus('job/1');

    expect(created).toMatchObject({
      submissionId: 'sub-1',
      datasetId: 'dataset-1',
      status: 'queued',
      effectiveDate: '2026-02-10',
      effectiveDatetime: '2026-02-10T12:00:00Z',
    });
    expect(status).toMatchObject({
      effectiveDate: '2026-02-10',
      effectiveDatetime: '2026-02-10T12:00:00Z',
      completedAt: '2026-02-10T00:02:00Z',
      validationErrors: [{ code: 'VALIDATION_FAILED', message: 'Bad row' }],
    });
    expect(job.jobId).toBe('job-1');

    const createCall = mockApiClient.postForm.mock.calls[0];
    expect(createCall?.[0]).toBe('/api/v1/submissions');
    expect(createCall?.[2]).toMatchObject({
      query: { activate_on_success: false },
      signal: undefined,
    });
    const createBody = createCall?.[1] as FormData;
    expect(createBody.get('file')).toBe(file);

    expect(mockApiClient.get).toHaveBeenNthCalledWith(
      1,
      '/api/v1/submissions/sub%2F1',
      { signal: undefined }
    );
    expect(mockApiClient.get).toHaveBeenNthCalledWith(
      2,
      '/api/v1/submissions',
      {
        query: {
          page: 2,
          pageSize: 25,
          status: 'failed',
          createdAfter: '2026-01-01T00:00:00Z',
          createdBefore: '2026-01-31T00:00:00Z',
        },
        signal: undefined,
      }
    );
    expect(mockApiClient.get).toHaveBeenNthCalledWith(
      3,
      '/api/v1/submissions/bulk/job%2F1',
      { signal: undefined }
    );
    expect(mockClearDatasetResponseCache).toHaveBeenCalledTimes(2);
  });

  test('submissionsService normalizes missing effective-date fields to null for older backend payloads', async () => {
    mockApiClient.postForm.mockResolvedValueOnce({
      submissionId: 'sub-legacy-create',
      datasetId: 'dataset-1',
      status: 'queued',
      fileName: 'legacy.csv',
      createdAt: '2026-02-10T00:00:00Z',
    });
    mockApiClient.get.mockResolvedValueOnce({
      submissionId: 'sub-legacy-status',
      datasetId: 'dataset-1',
      status: 'processing',
      fileName: 'legacy.csv',
      createdAt: '2026-02-10T00:00:00Z',
      completedAt: null,
      validationErrors: [],
    });

    const file = new File(['a,b\n1,2'], 'legacy.csv', { type: 'text/csv' });
    const created = await createDatasetSubmission({ file });
    const status = await getDatasetSubmissionStatus('sub-legacy-status');

    expect(created).toMatchObject({
      submissionId: 'sub-legacy-create',
      effectiveDate: null,
      effectiveDatetime: null,
    });
    expect(status).toMatchObject({
      submissionId: 'sub-legacy-status',
      effectiveDate: null,
      effectiveDatetime: null,
    });
  });

  test('submissionsService applies default query and form flags when optional fields are omitted', async () => {
    const file = new File(['a,b\n1,2'], 'latest.csv', { type: 'text/csv' });

    mockApiClient.postForm
      .mockResolvedValueOnce({
        submissionId: 'sub-default',
        datasetId: 'dataset-default',
        status: 'queued',
        fileName: 'latest.csv',
        createdAt: '2026-02-10T00:00:00Z',
      })
      .mockResolvedValueOnce({
        jobId: 'job-default',
        status: 'queued',
        totalFiles: 1,
        activateLatest: true,
        continueOnError: true,
        dryRun: false,
        createdAt: '2026-02-10T00:00:00Z',
      });
    mockApiClient.get.mockResolvedValueOnce({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });

    await createDatasetSubmission({ file });
    await listSubmissions();
    await createBulkSubmissionJob({ files: [file] });

    expect(mockApiClient.postForm).toHaveBeenNthCalledWith(
      1,
      '/api/v1/submissions',
      expect.any(FormData),
      {
        query: { activate_on_success: true },
        signal: undefined,
      }
    );
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/submissions', {
      query: {
        page: 1,
        pageSize: 20,
      },
      signal: undefined,
    });

    const bulkCall = mockApiClient.postForm.mock.calls[1];
    const bulkBody = bulkCall?.[1] as FormData;
    expect(bulkBody.get('activate_latest')).toBe('true');
    expect(bulkBody.get('continue_on_error')).toBe('true');
    expect(bulkBody.get('dry_run')).toBe('false');
  });

  test('listSubmissions keeps expected keys and normalizes invalid pagination values', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await withNodeEnv('development', async () => {
        await listSubmissions({
          page: Number.NaN,
          pageSize: Number.POSITIVE_INFINITY,
          status: 'processing',
          createdAfter: '2026-02-01T00:00:00Z',
          createdBefore: '',
        });
      });

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/submissions', {
        query: {
          page: 1,
          pageSize: 20,
          status: 'processing',
          createdAfter: '2026-02-01T00:00:00Z',
        },
        signal: undefined,
      });
      expect(warnSpy).toHaveBeenCalledTimes(2);
      const warningMessage = String(warnSpy.mock.calls[0]?.[0]);
      expect(warningMessage).toContain('/api/v1/submissions');
      expect(warningMessage).toContain('page');
      expect(String(warnSpy.mock.calls[1]?.[0])).toContain('pageSize');
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('listSubmissions suppresses pagination normalization warnings in production', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await withNodeEnv('production', async () => {
        await listSubmissions({
          page: 0,
          pageSize: -1,
          status: 'failed',
        });
      });

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/submissions', {
        query: {
          page: 1,
          pageSize: 20,
          status: 'failed',
        },
        signal: undefined,
      });
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});
