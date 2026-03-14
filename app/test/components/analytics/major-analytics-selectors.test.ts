import {
  selectCohortLabels,
  selectCohortKey,
  selectCohortOptions,
  selectCohortRowsByMajor,
  selectWeightedCreditsByMajor,
  selectWeightedGpaByMajor,
} from '@/features/metrics/components/major-analytics/selectors';
import {
  chartTooltipStyle,
  cohortColors,
  getCohortColor,
  majorChartColors,
} from '@/features/metrics/components/major-analytics/chart-theme';

const sample = [
  {
    major: 'Biology',
    cohort: 'FTIC 2024',
    cohortKey: 'FTIC_2024',
    cohortYear: 2024,
    avgGPA: 3.2,
    avgCredits: 16,
    studentCount: 100,
  },
  {
    major: 'Biology',
    cohort: 'FTIC cohort: 2024',
    cohortKey: 'FTIC_2024',
    cohortYear: 2024,
    avgGPA: 2.9,
    avgCredits: 14,
    studentCount: 20,
  },
  {
    major: 'Chemistry',
    cohort: 'FTIC 2023',
    cohortKey: 'FTIC_2023',
    cohortYear: 2023,
    avgGPA: 3.4,
    avgCredits: 18,
    studentCount: 80,
  },
  {
    major: 'Chemistry',
    cohort: 'UNKNOWN',
    cohortKey: 'UNKNOWN',
    cohortYear: null,
    avgGPA: 3.1,
    avgCredits: 12,
    studentCount: 10,
  },
];

describe('major analytics selectors', () => {
  test('selectCohortLabels sorts ascending by year with unknown buckets at the end', () => {
    expect(selectCohortLabels(sample)).toEqual([
      'FTIC 2023',
      'FTIC 2024',
      'Unknown',
    ]);
  });

  test('selectCohortOptions deduplicates labels by cohort key', () => {
    expect(
      selectCohortOptions(sample).map((option) => ({
        cohortKey: option.cohortKey,
        cohortLabel: option.cohortLabel,
      }))
    ).toEqual([
      { cohortKey: 'FTIC_2023', cohortLabel: 'FTIC 2023' },
      { cohortKey: 'FTIC_2024', cohortLabel: 'FTIC 2024' },
      { cohortKey: 'UNKNOWN', cohortLabel: 'Unknown' },
    ]);
  });

  test('selectCohortOptions sorts by known years, then non-year labels, then catch-all cohorts', () => {
    const options = selectCohortOptions([
      {
        major: 'Biology',
        cohort: 'Custom',
        cohortKey: 'CUSTOM_Z',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
      {
        major: 'Biology',
        cohort: 'Custom',
        cohortKey: 'CUSTOM_A',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
      {
        major: 'Biology',
        cohort: 'FTIC 2022',
        cohortKey: 'FTIC_2022',
        cohortYear: 2022,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
      {
        major: 'Biology',
        cohort: 'FTIC 2021',
        cohortKey: 'FTIC_2021',
        cohortYear: 2021,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
      {
        major: 'Biology',
        cohort: 'Other',
        cohortKey: 'OTHER',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
    ]);

    expect(options.map((option) => option.cohortKey)).toEqual([
      'FTIC_2021',
      'FTIC_2022',
      'CUSTOM_A',
      'CUSTOM_Z',
      'OTHER',
    ]);
  });

  test('selectCohortOptions prefers duplicate cohort keys that include explicit year metadata', () => {
    const options = selectCohortOptions([
      {
        major: 'Biology',
        cohort: 'Special Cohort',
        cohortKey: 'SPECIAL',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
      {
        major: 'Biology',
        cohort: 'FTIC 2026',
        cohortKey: 'SPECIAL',
        cohortYear: 2026,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
    ]);

    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      cohortKey: 'SPECIAL',
      cohortYear: 2026,
      cohortLabel: 'FTIC 2026',
    });
  });

  test('selectCohortOptions derives keys from year labels and custom labels when cohort keys are blank', () => {
    const options = selectCohortOptions([
      {
        major: 'Biology',
        cohort: 'FTIC 2025',
        cohortKey: '',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
      {
        major: 'Biology',
        cohort: 'Legacy Cohort',
        cohortKey: '',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
    ]);

    expect(options).toEqual([
      {
        cohortKey: 'FTIC_2025',
        cohortLabel: 'FTIC 2025',
        cohortYear: 2025,
        isCatchAll: false,
      },
      {
        cohortKey: 'COHORT_LEGACY_COHORT',
        cohortLabel: 'Legacy Cohort',
        cohortYear: null,
        isCatchAll: false,
      },
    ]);
  });

  test('selectCohortKey keeps backend cohortKey even when labels are unknown-ish or blank', () => {
    expect(
      selectCohortKey({
        major: 'Biology',
        cohort: 'unknown',
        cohortKey: 'FTIC_2024',
        cohortYear: 2024,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      })
    ).toBe('FTIC_2024');

    expect(
      selectCohortKey({
        major: 'Biology',
        cohort: '',
        cohortKey: 'FTIC_2024',
        cohortYear: 2024,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      })
    ).toBe('FTIC_2024');
  });

  test('selectCohortKey falls back to Unknown for legacy rows with missing cohort keys', () => {
    expect(
      selectCohortKey({
        major: 'Biology',
        cohort: 'N/A',
        cohortKey: '',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      })
    ).toBe('UNKNOWN');

    expect(
      selectCohortKey({
        major: 'Biology',
        cohort: 'other',
        cohortKey: '',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      })
    ).toBe('OTHER');

    expect(
      selectCohortKey({
        major: 'Biology',
        cohort: '***',
        cohortKey: '',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      })
    ).toBe('UNKNOWN');
  });

  test('selectCohortOptions uses canonical FTIC labels for year cohorts even when raw labels differ', () => {
    const options = selectCohortOptions([
      {
        major: 'Biology',
        cohort: 'Entering Class 2027',
        cohortKey: 'FTIC_2027',
        cohortYear: 2027,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
    ]);

    expect(options).toEqual([
      {
        cohortKey: 'FTIC_2027',
        cohortLabel: 'FTIC 2027',
        cohortYear: 2027,
        isCatchAll: false,
      },
    ]);
  });

  test('selectCohortOptions fills missing labels from cohort metadata when possible', () => {
    const options = selectCohortOptions([
      {
        major: 'Biology',
        cohort: '',
        cohortKey: 'FTIC_2026',
        cohortYear: 2026,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
      {
        major: 'Chemistry',
        cohort: '',
        cohortKey: 'LEGACY',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
    ]);

    expect(options).toEqual([
      {
        cohortKey: 'FTIC_2026',
        cohortLabel: 'FTIC 2026',
        cohortYear: 2026,
        isCatchAll: false,
      },
      {
        cohortKey: 'LEGACY',
        cohortLabel: 'Legacy',
        cohortYear: null,
        isCatchAll: false,
      },
    ]);
  });

  test('selectCohortOptions avoids duplicate Unknown labels for non-UNKNOWN keys', () => {
    const options = selectCohortOptions([
      {
        major: 'Biology',
        cohort: 'Unknown',
        cohortKey: 'UNKNOWN',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
      {
        major: 'Biology',
        cohort: 'Unknown',
        cohortKey: 'LEGACY',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
    ]);

    expect(options).toEqual([
      {
        cohortKey: 'LEGACY',
        cohortLabel: 'Legacy',
        cohortYear: null,
        isCatchAll: false,
      },
      {
        cohortKey: 'UNKNOWN',
        cohortLabel: 'Unknown',
        cohortYear: null,
        isCatchAll: true,
      },
    ]);
    expect(
      options.filter((option) => option.cohortLabel === 'Unknown')
    ).toHaveLength(1);
  });

  test('selectCohortOptions uses Unlabeled when humanized custom key is empty', () => {
    const options = selectCohortOptions([
      {
        major: 'Biology',
        cohort: '',
        cohortKey: 'COHORT_',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
    ]);

    expect(options).toEqual([
      {
        cohortKey: 'COHORT_',
        cohortLabel: 'Unlabeled',
        cohortYear: null,
        isCatchAll: false,
      },
    ]);
  });

  test('selectCohortOptions keeps Unknown/Other labels exclusive to catchall keys', () => {
    const options = selectCohortOptions([
      {
        major: 'Biology',
        cohort: 'Unknown',
        cohortKey: 'UNKNOWN',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
      {
        major: 'Biology',
        cohort: 'other',
        cohortKey: 'OTHER',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
      {
        major: 'Biology',
        cohort: '',
        cohortKey: 'COHORT_',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
    ]);

    expect(options.some((option) => option.cohortLabel === 'Unknown')).toBe(
      true
    );
    expect(options.some((option) => option.cohortLabel === 'Other')).toBe(true);

    options.forEach((option) => {
      if (option.cohortLabel === 'Unknown') {
        expect(option.cohortKey).toBe('UNKNOWN');
        expect(option.isCatchAll).toBe(true);
      }

      if (option.cohortLabel === 'Other') {
        expect(option.cohortKey).toBe('OTHER');
        expect(option.isCatchAll).toBe(true);
      }
    });
  });

  test('selectCohortOptions breaks same-year ties by label and then by cohort key', () => {
    const options = selectCohortOptions([
      {
        major: 'Biology',
        cohort: 'Alpha 2024',
        cohortKey: 'FTIC_2024_B',
        cohortYear: 2024,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
      {
        major: 'Biology',
        cohort: 'Beta 2024',
        cohortKey: 'FTIC_2024_C',
        cohortYear: 2024,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
      {
        major: 'Biology',
        cohort: 'Alpha 2024',
        cohortKey: 'FTIC_2024_A',
        cohortYear: 2024,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
    ]);

    expect(options.map((option) => option.cohortKey)).toEqual([
      'FTIC_2024_A',
      'FTIC_2024_B',
      'FTIC_2024_C',
    ]);
  });

  test('selectCohortOptions derives cohort year from cohortKey when cohortYear is null', () => {
    const options = selectCohortOptions([
      {
        major: 'Biology',
        cohort: 'FTIC 2030',
        cohortKey: 'FTIC_2030',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
    ]);

    expect(options[0]).toMatchObject({
      cohortKey: 'FTIC_2030',
      cohortYear: 2030,
    });
  });

  test('selectCohortOptions sorts non-year cohorts by label before catch-all cohorts', () => {
    const data = [
      {
        major: 'Biology',
        cohort: 'Unknown',
        cohortKey: 'UNKNOWN',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
      {
        major: 'Biology',
        cohort: 'Custom B',
        cohortKey: 'CUSTOM_B',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
      {
        major: 'Biology',
        cohort: 'Custom A',
        cohortKey: 'CUSTOM_A',
        cohortYear: null,
        avgGPA: 3,
        avgCredits: 12,
        studentCount: 1,
      },
    ];

    expect(selectCohortOptions(data).map((option) => option.cohortKey)).toEqual(
      ['CUSTOM_A', 'CUSTOM_B', 'UNKNOWN']
    );
    expect(
      selectCohortOptions([...data].reverse()).map((option) => option.cohortKey)
    ).toEqual(['CUSTOM_A', 'CUSTOM_B', 'UNKNOWN']);
  });

  test('weighted selectors aggregate by major', () => {
    const gpa = selectWeightedGpaByMajor(sample);
    expect(gpa[0]).toEqual({ major: 'Chemistry', avgGPA: 3.37 });

    const credits = selectWeightedCreditsByMajor(sample);
    expect(credits[0]).toEqual({ major: 'Chemistry', avgCredits: 17 });
  });

  test('weighted selectors handle null GPA and credits as zero', () => {
    const withNullMetrics = [
      {
        major: 'Math',
        cohort: 'FTIC 2024',
        cohortKey: 'FTIC_2024',
        cohortYear: 2024,
        avgGPA: null,
        avgCredits: null,
        studentCount: 10,
      },
      {
        major: 'Math',
        cohort: 'FTIC 2025',
        cohortKey: 'FTIC_2025',
        cohortYear: 2025,
        avgGPA: 3.0,
        avgCredits: 12,
        studentCount: 5,
      },
    ];

    const gpa = selectWeightedGpaByMajor(withNullMetrics);
    const credits = selectWeightedCreditsByMajor(withNullMetrics);

    expect(gpa).toEqual([{ major: 'Math', avgGPA: 1 }]);
    expect(credits).toEqual([{ major: 'Math', avgCredits: 4 }]);
  });

  test('selectCohortRowsByMajor includes missing cohort metrics as zero', () => {
    const rows = selectCohortRowsByMajor(sample, 'avgCredits');
    const chemistry = rows.find((row) => row.major === 'Chemistry');

    expect(chemistry?.FTIC_2024).toBe(0);
    expect(chemistry?.FTIC_2023).toBe(18);
  });

  test('selectCohortRowsByMajor supports avgGPA metric and null fallback values', () => {
    const withNulls = [
      ...sample,
      {
        major: 'Math',
        cohort: 'FTIC 2024',
        cohortKey: 'FTIC_2024',
        cohortYear: 2024,
        avgGPA: null,
        avgCredits: 9,
        studentCount: 5,
      },
    ];
    const rows = selectCohortRowsByMajor(withNulls, 'avgGPA');
    const math = rows.find((row) => row.major === 'Math');

    expect(math?.FTIC_2024).toBe(0);
    expect(math?.FTIC_2023).toBe(0);
  });

  test('getCohortColor uses fixed color when known and fallback palette when unknown', () => {
    expect(getCohortColor('FTIC 2024', 3)).toBe('var(--chart-2)');
    expect(getCohortColor('Custom Cohort', 11)).toBe(
      majorChartColors[11 % majorChartColors.length]
    );
  });

  test('chart theme constants are exported for tooltip and legacy cohorts', () => {
    expect(cohortColors['FTIC 2021']).toBe('var(--chart-1)');
    expect(chartTooltipStyle).toEqual({
      backgroundColor: 'var(--popover)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      color: 'var(--popover-foreground)',
    });
  });
});
