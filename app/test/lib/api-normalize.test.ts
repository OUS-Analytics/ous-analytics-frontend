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

  test('normalizes major and school insight payloads on overview responses', () => {
    const normalized = normalizeDatasetOverviewResponse({
      datasetId: 'dataset-1',
      snapshotTotals: {
        total: 10,
        undergrad: 10,
        ftic: 3,
        transfer: 2,
        international: 1,
      },
      activeMajors: 2,
      activeSchools: 1,
      activeMajorInsights: [
        {
          major: 'Computer Science',
          total: 12.2,
          shareOfActivePct: 123,
          international: 1.4,
          nonInternational: 10.9,
          internationalPct: -4,
          avgCumulativeGPA: 3.126,
          avgCumulativeCreditsEarned: 60.349,
          topSchools: [{ label: 'CEA', count: 12.9, pctOfGroup: 100.6 }],
          studentTypeMix: [
            { label: 'Continuing', count: 10.7, pctOfGroup: 88.88 },
          ],
        },
      ],
      schoolInsights: [
        {
          school: 'College of Arts & Sciences',
          total: 20.2,
          shareOfUndergradPct: 44.44,
          international: 2.2,
          nonInternational: 17.8,
          internationalPct: 9.95,
          avgCumulativeGPA: 3.014,
          avgCumulativeCreditsEarned: 59.019,
          activeMajorsCount: 7.8,
          topMajors: [{ label: 'Biology', count: 8.8, pctOfGroup: 40.5 }],
          studentTypeMix: [{ label: 'Transfer', count: 5.2, pctOfGroup: 26.1 }],
        },
      ],
      trend: [{ period: 'Fall 2024', year: 2024, semester: 1, total: 10 }],
      studentTypeDistribution: [],
      schoolDistribution: [],
    });

    expect(normalized.activeMajorInsights?.[0]).toEqual({
      major: 'Computer Science',
      total: 12,
      shareOfActivePct: 100,
      international: 1,
      nonInternational: 11,
      internationalPct: 0,
      avgCumulativeGPA: 3.13,
      avgCumulativeCreditsEarned: 60.35,
      topSchools: [{ label: 'CEA', count: 13, pctOfGroup: 100 }],
      studentTypeMix: [{ label: 'Continuing', count: 11, pctOfGroup: 88.9 }],
    });
    expect(normalized.schoolInsights?.[0]).toEqual({
      school: 'College of Arts & Sciences',
      total: 20,
      shareOfUndergradPct: 44.4,
      international: 2,
      nonInternational: 18,
      internationalPct: 10,
      avgCumulativeGPA: 3.01,
      avgCumulativeCreditsEarned: 59.02,
      activeMajorsCount: 8,
      topMajors: [{ label: 'Biology', count: 9, pctOfGroup: 40.5 }],
      studentTypeMix: [{ label: 'Transfer', count: 5, pctOfGroup: 26.1 }],
    });
  });

  test('normalizes undergraduate breakdown arrays and nullable insight metrics from mixed payloads', () => {
    let topMajorsReads = 0;
    const toggledTopMajorsInsight = {
      studentType: 'Transfer',
      total: 39.6,
      shareOfUndergradPct: 44.4,
      international: 2.7,
      nonInternational: 36.9,
      avgCumulativeGPA: null,
      avgCumulativeCreditsEarned: undefined,
      topSchools: [],
      get topMajors() {
        topMajorsReads += 1;
        return topMajorsReads === 1
          ? []
          : ('invalid-top-majors' as unknown as Array<{
              label: string;
              count: number;
              pctOfGroup: number;
            }>);
      },
    };

    const normalized = normalizeDatasetOverviewResponse({
      datasetId: 'dataset-undergrad-breakdown',
      snapshotTotals: {
        total: 110,
        undergrad: 100,
        ftic: 30,
        transfer: 30,
        international: 10,
      },
      activeMajors: 2,
      activeSchools: 1,
      undergraduateBreakdown: [
        {
          studentType: 'FTIC',
          total: 60.6,
          international: 10.2,
          nonInternational: 50.4,
        },
        {
          studentType: 'Invalid',
          total: 'bad',
          international: 1,
          nonInternational: 1,
        } as unknown as {
          studentType: string;
          total: number;
          international: number;
          nonInternational: number;
        },
      ],
      undergraduateBreakdownInsights: [
        {
          studentType: 'FTIC',
          total: 60.4,
          shareOfUndergradPct: 60.6,
          international: 10.2,
          nonInternational: 50.2,
          avgCumulativeGPA: 3.456,
          avgCumulativeCreditsEarned: 45.678,
          topMajors: [
            { label: 'Biology', count: 10.8, pctOfGroup: 22.25 },
            { label: 'Bad Count', count: Number.NaN, pctOfGroup: 10 },
          ],
          topSchools: [{ label: 'Arts', count: 20.4, pctOfGroup: 33.333 }],
        },
        toggledTopMajorsInsight,
        {
          studentType: 'Other',
          total: 5,
          shareOfUndergradPct: 'bad',
          international: 1,
          nonInternational: 4,
          avgCumulativeGPA: 3,
          avgCumulativeCreditsEarned: 30,
          topMajors: [],
          topSchools: [],
        } as unknown as {
          studentType: string;
          total: number;
          shareOfUndergradPct: number;
          international: number;
          nonInternational: number;
          avgCumulativeGPA: number | null;
          avgCumulativeCreditsEarned: number | null;
          topMajors: Array<{
            label: string;
            count: number;
            pctOfGroup: number;
          }>;
          topSchools: Array<{
            label: string;
            count: number;
            pctOfGroup: number;
          }>;
        },
      ],
      activeMajorInsights: [
        {
          major: 'Mathematics',
          total: 12,
          shareOfActivePct: 30,
          international: 2,
          nonInternational: 10,
          internationalPct: 16.6,
          avgCumulativeGPA: null,
          avgCumulativeCreditsEarned: undefined,
          topSchools: [],
          studentTypeMix: [],
        },
      ],
      schoolInsights: [
        {
          school: 'Science',
          total: 20,
          shareOfUndergradPct: 20,
          international: 1,
          nonInternational: 19,
          internationalPct: 5,
          avgCumulativeGPA: null,
          avgCumulativeCreditsEarned: undefined,
          activeMajorsCount: 4,
          topMajors: [],
          studentTypeMix: [],
        },
      ],
      trend: [{ period: 'Fall 2025', year: 2025, semester: 1, total: 100 }],
      studentTypeDistribution: [],
      schoolDistribution: [],
    });

    expect(normalized.undergraduateBreakdown).toEqual([
      {
        studentType: 'FTIC',
        total: 61,
        international: 10,
        nonInternational: 50,
      },
    ]);
    expect(normalized.undergraduateBreakdownInsights).toEqual([
      {
        studentType: 'FTIC',
        total: 60,
        shareOfUndergradPct: 60.6,
        international: 10,
        nonInternational: 50,
        avgCumulativeGPA: 3.46,
        avgCumulativeCreditsEarned: 45.68,
        topMajors: [{ label: 'Biology', count: 11, pctOfGroup: 22.3 }],
        topSchools: [{ label: 'Arts', count: 20, pctOfGroup: 33.3 }],
      },
      {
        studentType: 'Transfer',
        total: 40,
        shareOfUndergradPct: 44.4,
        international: 3,
        nonInternational: 37,
        avgCumulativeGPA: null,
        avgCumulativeCreditsEarned: null,
        topMajors: [],
        topSchools: [],
      },
    ]);
    expect(normalized.activeMajorInsights?.[0]?.avgCumulativeGPA).toBeNull();
    expect(
      normalized.activeMajorInsights?.[0]?.avgCumulativeCreditsEarned
    ).toBeNull();
    expect(normalized.schoolInsights?.[0]?.avgCumulativeGPA).toBeNull();
    expect(
      normalized.schoolInsights?.[0]?.avgCumulativeCreditsEarned
    ).toBeNull();
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

    expect(normalized.historical.map((point) => point.semester)).toEqual([
      1, 2,
    ]);
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
      historical: [
        { period: 'Fall 2024', year: 2024, semester: 1, total: 100 },
      ],
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
        trend: [
          { period: 'Fall 2024', year: 2024, semester: 'Fall', total: 10 },
        ],
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
        historical: [
          { period: 'Fall 2024', year: 2024, semester: 1, total: 10 },
        ],
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
        historical: [
          { period: 'Fall 2024', year: 2024, semester: 1, total: 10 },
        ],
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
        historical: [
          { period: 'Fall 2024', year: 2024, semester: 1, total: 10 },
        ],
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
