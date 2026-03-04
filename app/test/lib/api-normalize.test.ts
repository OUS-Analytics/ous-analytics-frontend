import {
  isRawDatasetForecastResponse,
  isRawDatasetOverviewResponse,
  normalizeDatasetForecastPoint,
  normalizeDatasetForecastResponse,
  normalizeDatasetOverviewResponse,
  normalizeDatasetTrendPoint,
} from '@/lib/api/normalize';

describe('api normalization', () => {
  test('preserves numeric semester values in trend points', () => {
    const normalized = normalizeDatasetTrendPoint({
      period: 'Fall 2024',
      year: 2024,
      semester: 1,
      total: 1200,
    });

    expect(normalized.semester).toBe(1);
  });

  test('preserves numeric semester values in forecast points', () => {
    const normalized = normalizeDatasetForecastPoint({
      period: 'Future',
      year: 2027,
      semester: 2,
      total: 1300,
      isForecasted: true,
    });

    expect(normalized.semester).toBe(2);
    expect(normalized.isForecasted).toBe(true);
  });

  test('preserves overview trend semester values without coercion', () => {
    const normalized = normalizeDatasetOverviewResponse({
      datasetId: 'dataset-1',
      snapshotTotals: {
        total: 3,
        undergrad: 3,
        ftic: 1,
        transfer: 1,
        international: 1,
      },
      activeMajors: 1,
      activeSchools: 1,
      trend: [
        { period: 'Fall 2024', year: 2024, semester: 1, total: 1 },
        { period: 'Spring 2025', year: 2025, semester: 2, total: 1 },
      ],
      studentTypeDistribution: [],
      schoolDistribution: [],
    });

    expect(normalized.trend.map((point) => point.semester)).toEqual([1, 2]);
  });

  test('preserves forecast semester values in both historical and forecast arrays', () => {
    const normalized = normalizeDatasetForecastResponse({
      datasetId: 'dataset-1',
      state: 'READY',
      methodologySummary: 'Backend methodology text.',
      assumptions: ['Assumption A', 'Assumption B'],
      dataCoverage: {
        minAcademicPeriod: 'Fall 2024',
        maxAcademicPeriod: 'Spring 2025',
      },
      fiveYearGrowthPct: 12.5,
      historical: [
        { period: 'Fall 2024', year: 2024, semester: 1, total: 100 },
        { period: 'Spring 2025', year: 2025, semester: 2, total: 101 },
      ],
      forecast: [
        {
          period: 'Fall 2025',
          year: 2025,
          semester: 1,
          total: 102,
          isForecasted: true,
        },
      ],
      insights: {
        projectedGrowthText: 'Projected growth.',
        resourcePlanningText: 'Plan resources.',
        recommendationText: 'Take action.',
      },
    });

    expect(normalized.historical.map((point) => point.semester)).toEqual([1, 2]);
    expect(normalized.forecast.map((point) => point.semester)).toEqual([1]);
    expect(normalized.state).toBe('READY');
    expect(normalized.methodologySummary).toBe('Backend methodology text.');
    expect(normalized.assumptions).toEqual(['Assumption A', 'Assumption B']);
    expect(normalized.dataCoverage).toEqual({
      minAcademicPeriod: 'Fall 2024',
      maxAcademicPeriod: 'Spring 2025',
    });
  });

  test('normalizeDatasetForecastResponse defaults lifecycle fields for legacy payloads', () => {
    const normalized = normalizeDatasetForecastResponse({
      datasetId: 'dataset-legacy',
      fiveYearGrowthPct: 3,
      historical: [{ period: 'Fall 2024', year: 2024, semester: 1, total: 100 }],
      forecast: [
        {
          period: 'Spring 2025',
          year: 2025,
          semester: 2,
          total: 120,
          isForecasted: true,
        },
      ],
      insights: {
        projectedGrowthText: 'Projected growth.',
        resourcePlanningText: 'Plan resources.',
        recommendationText: 'Take action.',
      },
    });

    expect(normalized.state).toBe('READY');
    expect(normalized.methodologySummary).toBe('');
    expect(normalized.assumptions).toEqual([]);
    expect(normalized.dataCoverage).toBeNull();
    expect(normalized.reason).toBeNull();
    expect(normalized.suggestedAction).toBeNull();
    expect(normalized.error).toBeNull();
  });

  test('normalizes NEEDS_REBUILD lifecycle metadata and guards invalid error payloads', () => {
    const normalized = normalizeDatasetForecastResponse({
      datasetId: 'dataset-needs-rebuild',
      state: 'NEEDS_REBUILD',
      methodologySummary: 'Methodology summary',
      assumptions: ['Assumption'],
      dataCoverage: {
        minAcademicPeriod: 123,
        maxAcademicPeriod: null,
      } as unknown as { minAcademicPeriod: string; maxAcademicPeriod: string },
      fiveYearGrowthPct: null,
      historical: [],
      forecast: [],
      insights: null,
      reason: 'Forecast rows are missing.',
      suggestedAction: 'Rebuild forecasts.',
      error: { code: 'BAD_ONLY' } as unknown as {
        code: string;
        message: string;
      },
    });

    expect(normalized.state).toBe('NEEDS_REBUILD');
    expect(normalized.dataCoverage).toEqual({
      minAcademicPeriod: null,
      maxAcademicPeriod: null,
    });
    expect(normalized.reason).toBe('Forecast rows are missing.');
    expect(normalized.suggestedAction).toBe('Rebuild forecasts.');
    expect(normalized.error).toBeNull();
  });

  test('normalizes FAILED lifecycle error payload and drops non-object error details', () => {
    const normalized = normalizeDatasetForecastResponse({
      datasetId: 'dataset-failed',
      state: 'FAILED',
      methodologySummary: 'Methodology summary',
      assumptions: [],
      dataCoverage: null,
      fiveYearGrowthPct: null,
      historical: [],
      forecast: [],
      insights: null,
      error: {
        code: 'FORECAST_BUILD_FAILED',
        message: 'Forecast build failed.',
        details: 'overflow',
      } as unknown as {
        code: string;
        message: string;
        details: Record<string, unknown>;
      },
    });

    expect(normalized.state).toBe('FAILED');
    expect(normalized.error).toEqual({
      code: 'FORECAST_BUILD_FAILED',
      message: 'Forecast build failed.',
      details: null,
    });
  });

  test('preserves FAILED lifecycle error details when details is an object', () => {
    const normalized = normalizeDatasetForecastResponse({
      datasetId: 'dataset-failed-details',
      state: 'FAILED',
      methodologySummary: 'Methodology summary',
      assumptions: [],
      dataCoverage: null,
      fiveYearGrowthPct: null,
      historical: [],
      forecast: [],
      insights: null,
      error: {
        code: 'FORECAST_BUILD_FAILED',
        message: 'Forecast build failed.',
        details: { datasetId: 'dataset-failed-details' },
      },
    });

    expect(normalized.error).toEqual({
      code: 'FORECAST_BUILD_FAILED',
      message: 'Forecast build failed.',
      details: { datasetId: 'dataset-failed-details' },
    });
  });

  test('normalizes lastObserved and model metadata when valid and drops invalid values', () => {
    const normalizedValid = normalizeDatasetForecastResponse({
      datasetId: 'dataset-model-valid',
      historical: [],
      forecast: [],
      lastObserved: {
        academicPeriod: 'Spring 2026',
        studentCount: 101.7,
      },
      model: {
        name: 'Holt',
        trend: 'add',
        seasonal: null,
        dampedTrend: true,
      },
    });
    const normalizedInvalid = normalizeDatasetForecastResponse({
      datasetId: 'dataset-model-invalid',
      historical: [],
      forecast: [],
      lastObserved: {
        academicPeriod: 2026,
        studentCount: '100',
      } as unknown,
      model: {
        name: 'Holt',
        dampedTrend: 'yes',
      } as unknown,
    });

    expect(normalizedValid.lastObserved).toEqual({
      academicPeriod: 'Spring 2026',
      studentCount: 102,
    });
    expect(normalizedValid.model).toEqual({
      name: 'Holt',
      trend: 'add',
      seasonal: null,
      dampedTrend: true,
    });
    expect(normalizedInvalid.lastObserved).toBeNull();
    expect(normalizedInvalid.model).toBeNull();
  });

  test('normalizes resolved horizon metadata when integer fields are provided', () => {
    const normalized = normalizeDatasetForecastResponse({
      datasetId: 'dataset-horizon',
      historical: [],
      forecast: [],
      selectedRange: 'medium',
      horizonYears: 3,
      horizonTerms: 9,
      termsPerYear: 3,
    });

    expect(normalized.selectedRange).toBe('medium');
    expect(normalized.horizonYears).toBe(3);
    expect(normalized.horizonTerms).toBe(9);
    expect(normalized.termsPerYear).toBe(3);
  });

  test('normalizes forecast range aliases and rejects non-integer horizon fields', () => {
    const normalizedShort = normalizeDatasetForecastResponse({
      datasetId: 'dataset-range-short',
      historical: [],
      forecast: [],
      selectedRange: 'short',
      horizonYears: 1.5,
      horizonTerms: 2.5,
      termsPerYear: 2.5,
    });
    const normalizedLong = normalizeDatasetForecastResponse({
      datasetId: 'dataset-range-long',
      historical: [],
      forecast: [],
      selectedRange: 'long',
      model: {
        name: 'ETS',
        trend: null,
        seasonal: 'add',
        dampedTrend: false,
      },
    });
    const normalizedInvalid = normalizeDatasetForecastResponse({
      datasetId: 'dataset-range-invalid',
      historical: [],
      forecast: [],
      selectedRange: 'yearly',
    });

    expect(normalizedShort.selectedRange).toBe('short');
    expect(normalizedShort.horizonYears).toBeNull();
    expect(normalizedShort.horizonTerms).toBeNull();
    expect(normalizedShort.termsPerYear).toBeNull();

    expect(normalizedLong.selectedRange).toBe('long');
    expect(normalizedLong.model).toEqual({
      name: 'ETS',
      trend: null,
      seasonal: 'add',
      dampedTrend: false,
    });

    expect(normalizedInvalid.selectedRange).toBeNull();
  });

  test('isRawDatasetOverviewResponse validates required trend shape', () => {
    expect(
      isRawDatasetOverviewResponse({
        datasetId: 'dataset-1',
        trend: [{ period: 'Fall 2024', year: 2024, semester: 1, total: 10 }],
      })
    ).toBe(true);

    expect(
      isRawDatasetOverviewResponse({
        datasetId: 'dataset-1',
        trend: [{ period: 'Fall 2024', year: 2024, semester: 'Fall', total: 10 }],
      })
    ).toBe(false);
    expect(
      isRawDatasetOverviewResponse({
        datasetId: 'dataset-1',
        trend: [{ period: 'Fall 2024', year: '2024', semester: 1, total: 10 }],
      })
    ).toBe(false);
    expect(isRawDatasetOverviewResponse({ trend: [123] })).toBe(false);
    expect(isRawDatasetOverviewResponse({ trend: 'bad' })).toBe(false);
  });

  test('isRawDatasetForecastResponse validates historical and forecast point shapes', () => {
    expect(
      isRawDatasetForecastResponse({
        datasetId: 'dataset-1',
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
      })
    ).toBe(true);

    expect(
      isRawDatasetForecastResponse({
        datasetId: 'dataset-1',
        historical: [{ period: 'Fall 2024', year: 2024, semester: 1, total: 10 }],
        forecast: [
          {
            period: 'Spring 2025',
            year: 2025,
            semester: 'Spring',
            total: 12,
            isForecasted: true,
          },
        ],
      })
    ).toBe(false);
    expect(
      isRawDatasetForecastResponse({
        datasetId: 'dataset-1',
        historical: [{ period: 'Fall 2024', year: 2024, semester: 1, total: 10 }],
        forecast: [
          {
            period: 'Spring 2025',
            year: 2025,
            semester: 2,
            total: 12,
          },
        ],
      })
    ).toBe(false);
    expect(
      isRawDatasetForecastResponse({
        datasetId: 'dataset-1',
        historical: [123],
        forecast: [],
      })
    ).toBe(false);
    expect(
      isRawDatasetForecastResponse({
        datasetId: 'dataset-1',
        historical: [],
        forecast: [123],
      })
    ).toBe(false);
    expect(
      isRawDatasetForecastResponse({ historical: [], forecast: 'bad' })
    ).toBe(false);
  });
});
