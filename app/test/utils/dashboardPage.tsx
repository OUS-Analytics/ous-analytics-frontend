import DashboardPage from '@/app/(dashboard)/page';
import type { useDashboardMetricsModel } from '@/features/dashboard/hooks';
import { renderWithProviders } from './render';

type DashboardModel = ReturnType<typeof useDashboardMetricsModel>;

export function buildDashboardModel(
  overrides: Partial<DashboardModel> = {}
): DashboardModel {
  const noop = jest.fn();

  return {
    selectedDate: new Date('2026-02-11'),
    setSelectedDate: noop,
    selectedSnapshotId: 'snap-1',
    currentDataDate: '2026-02-11',
    latestAvailableSnapshotDate: '2026-02-11',
    canGoToLatestAvailableDate: false,
    goToLatestAvailableDate: noop,
    availableSnapshotDates: [new Date('2026-02-11')],
    snapshotDatesLoading: false,
    snapshotDatesError: null,
    snapshotDateEmptyState: null,
    breakdownOpen: false,
    setBreakdownOpen: noop,
    migrationSemester: undefined,
    setMigrationSemester: noop,
    forecastHorizon: 4,
    setForecastHorizon: noop,
    handleDatasetUpload: noop,
    uploadLoading: false,
    uploadError: null,
    uploadFeedback: null,
    uploadRetryAvailable: false,
    retryDatasetUpload: noop,
    readModelState: 'ready',
    readModelStatus: null,
    readModelError: null,
    readModelPollingTimedOut: false,
    retryReadModelState: noop,
    activeDataset: null,
    datasetLoading: false,
    datasetError: null,
    dashboardViewState: 'ready',
    noDataset: false,
    retryDataset: noop,
    overviewData: null,
    overviewLoading: false,
    overviewError: null,
    retryOverview: noop,
    majorsData: null,
    majorsLoading: false,
    majorsError: null,
    majorsFilters: {},
    setMajorsFilters: noop,
    majorsFilterOptions: {
      academicPeriodOptions: [],
      schoolOptions: [],
      studentTypeOptions: [],
    },
    retryMajors: noop,
    migrationData: null,
    migrationLoading: false,
    migrationError: null,
    retryMigration: noop,
    forecastsData: null,
    forecastsLoading: false,
    forecastsError: null,
    retryForecasts: noop,
    ...overrides,
  } as DashboardModel;
}

export function renderDashboard(
  mockUseDashboardMetricsModel: jest.MockedFunction<
    typeof useDashboardMetricsModel
  >,
  overrides: Partial<DashboardModel> = {}
) {
  const model = buildDashboardModel(overrides);
  mockUseDashboardMetricsModel.mockReturnValue(model);

  return {
    model,
    ...renderWithProviders(<DashboardPage />),
  };
}
