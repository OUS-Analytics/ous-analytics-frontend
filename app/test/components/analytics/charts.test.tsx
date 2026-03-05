import { render, screen, within } from '@testing-library/react';
import { MetricsTrendChart } from '@/features/metrics/components/charts/MetricsTrendChart';
import { MajorDistributionChart } from '@/features/metrics/components/charts/MajorDistributionChart';
import { StudentTypeDistributionChart } from '@/features/metrics/components/charts/StudentTypeDistributionChart';
import { SchoolDistributionChart } from '@/features/metrics/components/charts/SchoolDistributionChart';
import { ForecastSection } from '@/features/metrics/components/ForecastSection';
import { buildForecastInsights } from '@/features/metrics/components/forecast/insights';
import { formatForecastYAxisTick } from '@/features/metrics/components/forecast/ForecastTrendChartPlot';
import {
  AvgCreditsByCohortChart,
  AvgCreditsByMajorChart,
  AvgGPAByCohortChart,
  AvgGPAByMajorChart,
} from '@/features/metrics/components/major-analytics-charts';
import { selectCohortOptions } from '@/features/metrics/components/major-analytics/selectors';
import { CohortSummaryTable } from '@/features/metrics/components/CohortSummaryTable';
import type { MajorCohortRecord } from '@/features/metrics/types';

const trendData = [
  { period: 'Fall 2023', total: 1000 },
  { period: 'Spring 2024', total: 1100 },
];

const forecastData = [{ period: 'Fall 2024', total: 1200, isForecasted: true }];

const majorData = [
  { major: 'Biology', count: 200 },
  { major: 'Chemistry', count: 150 },
];

const schoolData = [
  { school: 'College of Arts & Sciences', count: 300 },
  { school: 'School of Business', count: 200 },
];

const typeData = [
  { type: 'FTIC', count: 400 },
  { type: 'Transfer', count: 200 },
  { type: 'Other', count: 50 },
];

const cohortData: MajorCohortRecord[] = [
  {
    major: 'Biology',
    cohort: 'FTIC 2024',
    cohortKey: 'FTIC_2024',
    cohortYear: 2024,
    avgGPA: 3.1,
    avgCredits: 12,
    studentCount: 100,
  },
  {
    major: 'Biology',
    cohort: 'FTIC 2022',
    cohortKey: 'FTIC_2022',
    cohortYear: 2022,
    avgGPA: 3.2,
    avgCredits: 14,
    studentCount: 80,
  },
  {
    major: 'Chemistry',
    cohort: 'FTIC 2023',
    cohortKey: 'FTIC_2023',
    cohortYear: 2023,
    avgGPA: 2.9,
    avgCredits: 13,
    studentCount: 50,
  },
  {
    major: 'Physics',
    cohort: 'Entering Class 2027',
    cohortKey: 'FTIC_2027',
    cohortYear: 2027,
    avgGPA: 3.3,
    avgCredits: 16,
    studentCount: 40,
  },
  {
    major: 'Chemistry',
    cohort: 'UNKNOWN',
    cohortKey: 'UNKNOWN',
    cohortYear: null,
    avgGPA: 3.1,
    avgCredits: 12,
    studentCount: 25,
  },
];

describe('analytics charts', () => {
  test('AnalyticsTrendChart renders with and without forecasts', () => {
    const { rerender } = render(<MetricsTrendChart data={trendData} />);
    expect(screen.getByText('Student Trends Over Time')).toBeInTheDocument();
    expect(screen.queryByText('Forecasted')).not.toBeInTheDocument();

    rerender(
      <MetricsTrendChart data={trendData} forecastData={forecastData} />
    );
    expect(screen.getByText('Forecasted')).toBeInTheDocument();
  });

  test('Major and student charts render', () => {
    render(<MajorDistributionChart data={majorData} />);
    expect(screen.getByText('Students by Major')).toBeInTheDocument();

    render(<StudentTypeDistributionChart data={typeData} />);
    expect(screen.getByText('Student Type Distribution')).toBeInTheDocument();

    render(<SchoolDistributionChart data={schoolData} />);
    expect(screen.getByText('Students by School/College')).toBeInTheDocument();
  });

  test('ForecastSection and analytics charts render', () => {
    render(
      <ForecastSection historicalData={trendData} forecastData={forecastData} />
    );
    expect(screen.getByText('Student Forecast')).toBeInTheDocument();
    expect(screen.getByText('Projected Growth')).toBeInTheDocument();

    render(<ForecastSection historicalData={[]} forecastData={[]} />);
    expect(screen.getAllByText('Student Forecast').length).toBeGreaterThan(1);

    render(<AvgGPAByMajorChart data={cohortData} />);
    render(<AvgCreditsByMajorChart data={cohortData} />);
    render(<AvgGPAByCohortChart data={cohortData} />);
    render(<AvgCreditsByCohortChart data={cohortData} />);

    expect(screen.getByText('Average GPA by Major')).toBeInTheDocument();
    expect(
      screen.getByText('Average Credits Earned by Major')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Average GPA by Major and FTIC Cohort')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Average Credits Earned by Major and FTIC Cohort')
    ).toBeInTheDocument();
  });

  test('ForecastSection renders all forecast periods from long horizons', () => {
    const longForecastData = [
      { period: 'Fall 2026', total: 1010, isForecasted: true },
      { period: 'Spring 2027', total: 1020, isForecasted: true },
      { period: 'Fall 2027', total: 1030, isForecasted: true },
      { period: 'Spring 2028', total: 1040, isForecasted: true },
      { period: 'Fall 2028', total: 1050, isForecasted: true },
      { period: 'Spring 2029', total: 1060, isForecasted: true },
      { period: 'Fall 2029', total: 1070, isForecasted: true },
      { period: 'Spring 2030', total: 1080, isForecasted: true },
      { period: 'Fall 2030', total: 1090, isForecasted: true },
      { period: 'Spring 2031', total: 1100, isForecasted: true },
    ];

    render(
      <ForecastSection historicalData={trendData} forecastData={longForecastData} />
    );

    expect(screen.getByText('Showing 10 terms')).toBeInTheDocument();
    expect(screen.getByText('Spring 2031')).toBeInTheDocument();
  });

  test('ForecastSection sorts forecast periods before rendering the numbers card', () => {
    const unsortedForecastData = [
      { period: 'Spring 2027', total: 1030, isForecasted: true },
      { period: 'Fall 2026', total: 1020, isForecasted: true },
      { period: 'Spring 2026', total: 1010, isForecasted: true },
    ];

    render(
      <ForecastSection
        historicalData={[
          { period: 'Spring 2024', total: 1100 },
          { period: 'Fall 2023', total: 1000 },
        ]}
        forecastData={unsortedForecastData}
      />
    );

    const numbersCard = screen
      .getByText('Forecasted Numbers')
      .closest('.bg-card') as HTMLElement;
    const orderedPeriods = within(numbersCard)
      .getAllByText(/^(Spring|Summer|Fall)\s\d{4}$/)
      .map((element) => element.textContent);

    expect(orderedPeriods).toEqual([
      'Spring 2026',
      'Fall 2026',
      'Spring 2027',
    ]);
  });

  test('forecast helpers format y-axis values and insight fallbacks for growth directions', () => {
    expect(formatForecastYAxisTick(1_000_000)).toBe('1M');
    expect(formatForecastYAxisTick(1_250_000)).toBe('1.3M');
    expect(formatForecastYAxisTick(12_500)).toBe('12.5k');
    expect(formatForecastYAxisTick(999)).toBe('999');

    const stable = buildForecastInsights({ fiveYearGrowthPct: 1.2 });
    const growth = buildForecastInsights({ fiveYearGrowthPct: 6.4 });
    const decline = buildForecastInsights({ fiveYearGrowthPct: -3.2 });

    expect(stable[0]?.description).toContain('remain relatively stable');
    expect(growth[0]?.description).toContain('grow by ~6.4%');
    expect(decline[0]?.description).toContain('decline by ~3.2%');
  });

  test('cohort charts and summary tabs use the same normalized cohort ordering', () => {
    render(
      <>
        <AvgGPAByCohortChart data={cohortData} />
        <CohortSummaryTable data={cohortData} />
      </>
    );

    const expectedOrder = [
      'FTIC 2022',
      'FTIC 2023',
      'FTIC 2024',
      'FTIC 2027',
      'Unknown',
    ];
    expect(
      selectCohortOptions(cohortData).map((option) => option.cohortLabel)
    ).toEqual(expectedOrder);
    const tabLabels = screen
      .getAllByRole('tab')
      .map((tab) => tab.textContent?.trim() ?? '');
    expect(tabLabels).toEqual(expectedOrder);

    const chartCard = screen
      .getByText('Average GPA by Major and FTIC Cohort')
      .closest('.bg-card');
    expect(chartCard).not.toBeNull();

    const legend = within(chartCard as HTMLElement).getByTestId(
      'cohort-legend'
    );
    const legendLabels = within(legend)
      .getAllByTestId('cohort-legend-label')
      .map((label) => label.textContent?.trim() ?? '');
    expect(legendLabels).toEqual(expectedOrder);
  });
});
