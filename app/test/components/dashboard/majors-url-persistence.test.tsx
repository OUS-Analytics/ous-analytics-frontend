import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardTabs } from '@/features/dashboard/components/DashboardTabs';
import { useDashboardMetricsModel } from '@/features/dashboard/hooks';
import { ServiceError } from '@/lib/api/errors';
import { getActiveDataset, getDatasetById } from '@/features/datasets/api';
import { getDatasetOverview } from '@/features/overview/api';
import { getMajorsAnalytics } from '@/features/majors/api';
import { getMigrationAnalytics } from '@/features/migration/api';
import { getForecastsAnalytics } from '@/features/forecasts/api';
import { listSnapshots } from '@/features/snapshots/api';

const SelectContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
} | null>(null);

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
};
let mockSearchParamsString = '';

function setMockSearchParams(search: string) {
  mockSearchParamsString = search.startsWith('?') ? search.slice(1) : search;
}

function applyMockNavigationHref(href: string) {
  const [, query = ''] = href.split('?');
  setMockSearchParams(query);
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
}));

jest.mock('@/features/filters/components/DateFilterButton', () => ({
  DateFilterButton: () => <div>Date Filter</div>,
}));

jest.mock('@/features/dashboard/components/panels/OverviewPanel', () => ({
  OverviewPanel: () => <div>Overview Panel</div>,
}));

jest.mock('@/features/dashboard/components/panels/MigrationPanel', () => ({
  MigrationPanel: () => <div>Migration Panel</div>,
}));

jest.mock('@/features/dashboard/components/panels/ForecastsPanel', () => ({
  ForecastsPanel: () => <div>Forecasts Panel</div>,
}));

jest.mock('@/features/metrics/components/MetricsSummaryCard', () => ({
  MetricsSummaryCard: ({ title }: { title: string }) => (
    <div>{`Summary: ${title}`}</div>
  ),
}));

jest.mock(
  '@/features/metrics/components/charts/MajorDistributionChart',
  () => ({
    MajorDistributionChart: () => <div>MajorDistributionChart</div>,
  })
);

jest.mock('@/features/metrics/components/major-analytics-charts', () => ({
  AvgCreditsByCohortChart: () => <div>AvgCreditsByCohortChart</div>,
  AvgCreditsByMajorChart: () => <div>AvgCreditsByMajorChart</div>,
  AvgGPAByCohortChart: () => <div>AvgGPAByCohortChart</div>,
  AvgGPAByMajorChart: () => <div>AvgGPAByMajorChart</div>,
}));

jest.mock('@/features/metrics/components/CohortSummaryTable', () => ({
  CohortSummaryTable: () => <div>CohortSummaryTable</div>,
}));

jest.mock('@/shared/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div>{children}</div>
    </SelectContext.Provider>
  ),
  SelectTrigger: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    'aria-label'?: string;
  }) => {
    const context = React.useContext(SelectContext);

    return (
      <button {...props} data-current-value={context?.value}>
        {children}
      </button>
    );
  },
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => {
    const context = React.useContext(SelectContext);

    return (
      <button onClick={() => context?.onValueChange(value)}>{children}</button>
    );
  },
}));

jest.mock('@/features/datasets/api', () => ({
  getActiveDataset: jest.fn(),
  getDatasetById: jest.fn(),
}));

jest.mock('@/features/overview/api', () => ({
  getDatasetOverview: jest.fn(),
}));

jest.mock('@/features/majors/api', () => ({
  getMajorsAnalytics: jest.fn(),
}));

jest.mock('@/features/migration/api', () => ({
  getMigrationAnalytics: jest.fn(),
}));

jest.mock('@/features/forecasts/api', () => ({
  getForecastsAnalytics: jest.fn(),
}));

jest.mock('@/features/snapshots/api', () => ({
  createSnapshotForecastRebuildJob: jest.fn(),
  listSnapshots: jest.fn(),
}));

const mockGetActiveDataset = getActiveDataset as jest.MockedFunction<
  typeof getActiveDataset
>;
const mockGetDatasetById = getDatasetById as jest.MockedFunction<
  typeof getDatasetById
>;
const mockGetDatasetOverview = getDatasetOverview as jest.MockedFunction<
  typeof getDatasetOverview
>;
const mockGetMajorsAnalytics = getMajorsAnalytics as jest.MockedFunction<
  typeof getMajorsAnalytics
>;
const mockGetMigrationAnalytics = getMigrationAnalytics as jest.MockedFunction<
  typeof getMigrationAnalytics
>;
const mockGetForecastsAnalytics = getForecastsAnalytics as jest.MockedFunction<
  typeof getForecastsAnalytics
>;
const mockListSnapshots = listSnapshots as jest.MockedFunction<
  typeof listSnapshots
>;

function hasMajorsRequestWithFilters(expected: {
  academicPeriod: string;
  school: string;
  studentType: string;
}) {
  return mockGetMajorsAnalytics.mock.calls.some(([_datasetId, options]) => {
    const filters = options?.filters;
    return (
      filters?.academicPeriod === expected.academicPeriod &&
      filters?.school === expected.school &&
      filters?.studentType === expected.studentType
    );
  });
}

function mockSuccessfulReads(datasetId: string) {
  mockGetDatasetOverview.mockResolvedValue({
    datasetId,
    snapshotTotals: {
      total: 200,
      undergrad: 150,
      ftic: 50,
      transfer: 40,
      international: 20,
    },
    activeMajors: 2,
    activeSchools: 2,
    studentTypeDistribution: [],
    schoolDistribution: [],
    trend: [],
  });
  mockGetMajorsAnalytics.mockImplementation(async () => ({
    datasetId,
    analyticsRecords: [
      {
        year: 2025,
        semester: 'Fall',
        major: 'Biology',
        school: 'School of Science',
        studentType: 'FTIC',
        count: 100,
      },
      {
        year: 2026,
        semester: 'Spring',
        major: 'Chemistry',
        school: 'School of Engineering',
        studentType: 'Transfer',
        count: 50,
      },
    ],
    majorDistribution: [{ major: 'Biology', count: 100 }],
    cohortRecords: [],
  }));
  mockGetMigrationAnalytics.mockResolvedValue({
    datasetId,
    semesters: [],
    records: [],
  });
  mockGetForecastsAnalytics.mockResolvedValue({
    datasetId,
    historical: [],
    forecast: [],
    fiveYearGrowthPct: 0,
    insights: {
      projectedGrowthText: '',
      resourcePlanningText: '',
      recommendationText: '',
    },
  });
}

function DashboardMajorsHarness() {
  const model = useDashboardMetricsModel();
  return <DashboardTabs model={model} />;
}

describe('majors filters URL persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, '', '/');
    setMockSearchParams('');
    mockRouter.push.mockImplementation((href: string) => {
      applyMockNavigationHref(href);
    });
    mockRouter.replace.mockImplementation((href: string) => {
      applyMockNavigationHref(href);
    });

    mockGetActiveDataset.mockResolvedValue({
      datasetId: 'dataset-1',
      name: 'enrollment.csv',
      status: 'ready',
      isActive: true,
      createdAt: '2026-02-11T00:00:00Z',
      sourceSubmissionId: 'sub-1',
    });
    mockGetDatasetById.mockResolvedValue({
      datasetId: 'dataset-1',
      name: 'enrollment.csv',
      status: 'ready',
      isActive: true,
      createdAt: '2026-02-11T00:00:00Z',
      sourceSubmissionId: 'sub-1',
    });
    mockListSnapshots.mockRejectedValue(
      new ServiceError(
        'NETWORK_ERROR',
        'Unable to load available snapshot dates.',
        true
      )
    );
    mockSuccessfulReads('dataset-1');
  });

  test('updates URL params and requests majors analytics with selected filters', async () => {
    setMockSearchParams('?date=2026-02-11');
    const user = userEvent.setup();

    const { rerender } = render(<DashboardMajorsHarness />);

    await user.click(screen.getByRole('tab', { name: 'Majors' }));

    await waitFor(() => {
      expect(screen.getByTestId('majors-filter-panel')).toBeInTheDocument();
    });

    const semesterFilter = screen.getByText('Semester').closest('div');
    const schoolFilter = screen.getByText('School').closest('div');
    const studentTypeFilter = screen.getByText('Student Type').closest('div');

    expect(semesterFilter).not.toBeNull();
    expect(schoolFilter).not.toBeNull();
    expect(studentTypeFilter).not.toBeNull();

    await user.click(
      within(semesterFilter as HTMLElement).getByRole('button', {
        name: 'Fall 2025',
      })
    );
    rerender(<DashboardMajorsHarness />);
    await waitFor(() => {
      expect(screen.getByLabelText('Select semester')).toHaveAttribute(
        'data-current-value',
        'Fall 2025'
      );
    });

    await user.click(
      within(schoolFilter as HTMLElement).getByRole('button', {
        name: 'School of Science',
      })
    );
    rerender(<DashboardMajorsHarness />);
    await waitFor(() => {
      expect(screen.getByLabelText('Select school')).toHaveAttribute(
        'data-current-value',
        'School of Science'
      );
    });

    await user.click(
      within(studentTypeFilter as HTMLElement).getByRole('button', {
        name: 'FTIC',
      })
    );
    rerender(<DashboardMajorsHarness />);
    await waitFor(() => {
      expect(screen.getByLabelText('Select student type')).toHaveAttribute(
        'data-current-value',
        'FTIC'
      );
    });

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalled();
    });

    const lastReplaceArg = mockRouter.replace.mock.calls.at(-1)?.[0] as string;
    const params = new URLSearchParams(lastReplaceArg.split('?')[1] ?? '');

    expect(params.get('date')).toBe('2026-02-11');
    expect(params.get('academicPeriod')).toBe('Fall 2025');
    expect(params.get('school')).toBe('School of Science');
    expect(params.get('studentType')).toBe('FTIC');

    await waitFor(() => {
      expect(
        hasMajorsRequestWithFilters({
          academicPeriod: 'Fall 2025',
          school: 'School of Science',
          studentType: 'FTIC',
        })
      ).toBe(true);
    });
  });

  test('initializes filters from URL and keeps selected values in the UI', async () => {
    setMockSearchParams(
      '?date=2026-02-11&academicPeriod=Fall%202025&school=School%20of%20Science&studentType=FTIC'
    );
    const user = userEvent.setup();

    render(<DashboardMajorsHarness />);

    await user.click(screen.getByRole('tab', { name: 'Majors' }));

    await waitFor(() => {
      expect(screen.getByTestId('majors-filter-panel')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Select semester')).toHaveAttribute(
      'data-current-value',
      'Fall 2025'
    );
    expect(screen.getByLabelText('Select school')).toHaveAttribute(
      'data-current-value',
      'School of Science'
    );
    expect(screen.getByLabelText('Select student type')).toHaveAttribute(
      'data-current-value',
      'FTIC'
    );

    await waitFor(() => {
      expect(
        hasMajorsRequestWithFilters({
          academicPeriod: 'Fall 2025',
          school: 'School of Science',
          studentType: 'FTIC',
        })
      ).toBe(true);
    });
  });
});
