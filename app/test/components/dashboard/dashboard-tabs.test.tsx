import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardTabs } from '@/features/dashboard/components/DashboardTabs';

const overviewPanelMock = jest.fn(() => <div>Overview Panel Mock</div>);
const majorsPanelMock = jest.fn(() => <div>Majors Panel Mock</div>);
const migrationPanelMock = jest.fn(() => <div>Migration Panel Mock</div>);
const forecastsPanelMock = jest.fn(() => <div>Forecasts Panel Mock</div>);

jest.mock('@/features/dashboard/components/panels/OverviewPanel', () => ({
  OverviewPanel: (props: unknown) => overviewPanelMock(props),
}));

jest.mock('@/features/dashboard/components/panels/MajorsPanel', () => ({
  MajorsPanel: (props: unknown) => majorsPanelMock(props),
}));

jest.mock('@/features/dashboard/components/panels/MigrationPanel', () => ({
  MigrationPanel: (props: unknown) => migrationPanelMock(props),
}));

jest.mock('@/features/dashboard/components/panels/ForecastsPanel', () => ({
  ForecastsPanel: (props: unknown) => forecastsPanelMock(props),
}));

jest.mock('@/features/filters/components/DateFilterButton', () => ({
  DateFilterButton: () => <div>Date Filter Mock</div>,
}));

describe('DashboardTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders tab triggers and only mounts the active panel', async () => {
    const props = {
      selectedDate: new Date('2026-02-11'),
      setSelectedDate: jest.fn(),
      currentDataDate: '2026-02-11',
      availableSnapshotDates: [new Date('2026-02-11')],
      snapshotDatesLoading: false,
      snapshotDatesError: null,
      snapshotDateEmptyState: null,
      snapshotCoverage: {
        minEffectiveDate: '2026-01-29',
        maxEffectiveDate: '2026-02-11',
        rangeStartDate: '2026-01-29',
        rangeEndDate: '2026-02-11',
        missingWeekdays: [],
        missingWeekdayCount: 0,
      },
      snapshotCoverageLoading: false,
      snapshotCoverageError: null,
      snapshotCoverageRangeDays: 14,
      latestAvailableSnapshotDate: '2026-02-11',
      canGoToLatestAvailableDate: false,
      goToLatestAvailableDate: jest.fn(),
      handleDatasetUpload: jest.fn(),
      uploadLoading: false,
      uploadError: null,
      uploadFeedback: null,
      uploadRetryAvailable: false,
      retryDatasetUpload: jest.fn(),
      readModelState: 'ready',
      readModelStatus: null,
      readModelError: null,
      readModelPollingTimedOut: false,
      retryReadModelState: jest.fn(),
      breakdownOpen: false,
      setBreakdownOpen: jest.fn(),
      overviewData: null,
      overviewLoading: true,
      overviewError: null,
      retryOverview: jest.fn(),
      majorsData: null,
      majorsLoading: false,
      majorsError: { code: 'UNKNOWN', message: 'majors err', retryable: true },
      majorsFilters: {},
      setMajorsFilters: jest.fn(),
      majorsFilterOptions: {
        academicPeriodOptions: [],
        schoolOptions: [],
        studentTypeOptions: [],
      },
      retryMajors: jest.fn(),
      migrationData: null,
      migrationLoading: false,
      migrationError: null,
      migrationSemester: 'Fall 2025',
      setMigrationSemester: jest.fn(),
      migrationStartSemester: 'Fall 2024',
      migrationEndSemester: 'Spring 2025',
      setMigrationStartSemester: jest.fn(),
      setMigrationEndSemester: jest.fn(),
      retryMigration: jest.fn(),
      forecastsData: null,
      forecastsLoading: false,
      forecastsError: null,
      forecastHorizon: 4,
      setForecastHorizon: jest.fn(),
      retryForecasts: jest.fn(),
    } as const;

    render(<DashboardTabs model={props} />);

    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Majors' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Migration' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Forecasts' })).toBeInTheDocument();
    expect(
      screen.getByText('No missing weekdays (last 14 days)')
    ).toBeInTheDocument();

    expect(overviewPanelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currentDataDate: props.currentDataDate,
        onDatasetUpload: props.handleDatasetUpload,
        uploadLoading: props.uploadLoading,
        uploadFeedback: props.uploadFeedback,
        data: props.overviewData,
        readModelState: props.readModelState,
        readModelPollingTimedOut: props.readModelPollingTimedOut,
        onRetryUpload: props.retryDatasetUpload,
      })
    );
    expect(majorsPanelMock).not.toHaveBeenCalled();
    expect(migrationPanelMock).not.toHaveBeenCalled();
    expect(forecastsPanelMock).not.toHaveBeenCalled();

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Majors' }));

    expect(majorsPanelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: props.majorsData,
        loading: props.majorsLoading,
        error: props.majorsError,
        readModelStatus: props.readModelStatus,
      })
    );
    expect(overviewPanelMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('tab', { name: 'Migration' }));
    expect(migrationPanelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: props.migrationData,
        migrationStartSemester: props.migrationStartSemester,
        migrationEndSemester: props.migrationEndSemester,
        onStartSemesterChange: props.setMigrationStartSemester,
        onEndSemesterChange: props.setMigrationEndSemester,
      })
    );

    await user.click(screen.getByRole('tab', { name: 'Forecasts' }));
    expect(forecastsPanelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: props.forecastsData,
        loading: props.forecastsLoading,
        error: props.forecastsError,
        onReadModelRetry: props.retryReadModelState,
      })
    );
  });

  test('shows snapshot date empty state across tabs and supports latest-date recovery', async () => {
    const goToLatestAvailableDate = jest.fn();
    const props = {
      selectedDate: null,
      setSelectedDate: jest.fn(),
      currentDataDate: null,
      availableSnapshotDates: [],
      snapshotDatesLoading: false,
      snapshotDatesError: null,
      snapshotDateEmptyState: {
        title: 'Selected date is unavailable',
        description: 'Choose another date.',
      },
      snapshotCoverage: {
        minEffectiveDate: null,
        maxEffectiveDate: null,
        rangeStartDate: null,
        rangeEndDate: null,
        missingWeekdays: [],
        missingWeekdayCount: 0,
      },
      snapshotCoverageLoading: false,
      snapshotCoverageError: null,
      snapshotCoverageRangeDays: 14,
      latestAvailableSnapshotDate: '2026-02-11',
      canGoToLatestAvailableDate: true,
      goToLatestAvailableDate,
      handleDatasetUpload: jest.fn(),
      uploadLoading: false,
      uploadError: null,
      uploadFeedback: null,
      uploadRetryAvailable: false,
      retryDatasetUpload: jest.fn(),
      readModelState: 'ready',
      readModelStatus: null,
      readModelError: null,
      readModelPollingTimedOut: false,
      retryReadModelState: jest.fn(),
      breakdownOpen: false,
      setBreakdownOpen: jest.fn(),
      overviewData: null,
      overviewLoading: false,
      overviewError: null,
      retryOverview: jest.fn(),
      majorsData: null,
      majorsLoading: false,
      majorsError: null,
      majorsFilters: {},
      setMajorsFilters: jest.fn(),
      majorsFilterOptions: {
        academicPeriodOptions: [],
        schoolOptions: [],
        studentTypeOptions: [],
      },
      retryMajors: jest.fn(),
      migrationData: null,
      migrationLoading: false,
      migrationError: null,
      migrationSemester: undefined,
      setMigrationSemester: jest.fn(),
      retryMigration: jest.fn(),
      forecastsData: null,
      forecastsLoading: false,
      forecastsError: null,
      forecastHorizon: 4,
      setForecastHorizon: jest.fn(),
      retryForecasts: jest.fn(),
    } as const;

    render(<DashboardTabs model={props} />);

    expect(
      screen.getByText('Selected date is unavailable')
    ).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: 'Go to latest available' })
    );
    expect(goToLatestAvailableDate).toHaveBeenCalledTimes(1);
    expect(overviewPanelMock).not.toHaveBeenCalled();
    expect(majorsPanelMock).not.toHaveBeenCalled();
    expect(migrationPanelMock).not.toHaveBeenCalled();
    expect(forecastsPanelMock).not.toHaveBeenCalled();
  });

  test('renders snapshot error and falls back to raw current data date label when invalid', () => {
    const props = {
      selectedDate: null,
      setSelectedDate: jest.fn(),
      currentDataDate: 'not-a-date',
      availableSnapshotDates: [new Date('2026-02-11')],
      snapshotDatesLoading: false,
      snapshotDatesError: {
        code: 'NETWORK_ERROR',
        message: 'Unable to load available snapshot dates.',
        retryable: true,
      },
      snapshotDateEmptyState: null,
      snapshotCoverage: {
        minEffectiveDate: null,
        maxEffectiveDate: null,
        rangeStartDate: null,
        rangeEndDate: null,
        missingWeekdays: [],
        missingWeekdayCount: 0,
      },
      snapshotCoverageLoading: false,
      snapshotCoverageError: null,
      snapshotCoverageRangeDays: 14,
      latestAvailableSnapshotDate: '2026-02-11',
      canGoToLatestAvailableDate: false,
      goToLatestAvailableDate: jest.fn(),
      handleDatasetUpload: jest.fn(),
      uploadLoading: false,
      uploadError: null,
      uploadFeedback: null,
      uploadRetryAvailable: false,
      retryDatasetUpload: jest.fn(),
      readModelState: 'ready',
      readModelStatus: null,
      readModelError: null,
      readModelPollingTimedOut: false,
      retryReadModelState: jest.fn(),
      breakdownOpen: false,
      setBreakdownOpen: jest.fn(),
      overviewData: null,
      overviewLoading: false,
      overviewError: null,
      retryOverview: jest.fn(),
      majorsData: null,
      majorsLoading: false,
      majorsError: null,
      majorsFilters: {},
      setMajorsFilters: jest.fn(),
      majorsFilterOptions: {
        academicPeriodOptions: [],
        schoolOptions: [],
        studentTypeOptions: [],
      },
      retryMajors: jest.fn(),
      migrationData: null,
      migrationLoading: false,
      migrationError: null,
      migrationSemester: undefined,
      setMigrationSemester: jest.fn(),
      retryMigration: jest.fn(),
      forecastsData: null,
      forecastsLoading: false,
      forecastsError: null,
      forecastHorizon: 4,
      setForecastHorizon: jest.fn(),
      retryForecasts: jest.fn(),
    } as const;

    render(<DashboardTabs model={props} />);

    expect(screen.getByText(/Current data date: not-a-date/)).toBeInTheDocument();
    expect(
      screen.getByText('Unable to load available snapshot dates.')
    ).toBeInTheDocument();
  });

  test('does not render latest-date recovery button when no latest snapshot is available', () => {
    const props = {
      selectedDate: null,
      setSelectedDate: jest.fn(),
      currentDataDate: null,
      availableSnapshotDates: [],
      snapshotDatesLoading: false,
      snapshotDatesError: null,
      snapshotDateEmptyState: {
        title: 'Selected date is unavailable',
        description: 'No snapshot found.',
      },
      snapshotCoverage: {
        minEffectiveDate: null,
        maxEffectiveDate: null,
        rangeStartDate: null,
        rangeEndDate: null,
        missingWeekdays: [],
        missingWeekdayCount: 0,
      },
      snapshotCoverageLoading: false,
      snapshotCoverageError: null,
      snapshotCoverageRangeDays: 14,
      latestAvailableSnapshotDate: null,
      canGoToLatestAvailableDate: false,
      goToLatestAvailableDate: jest.fn(),
      handleDatasetUpload: jest.fn(),
      uploadLoading: false,
      uploadError: null,
      uploadFeedback: null,
      uploadRetryAvailable: false,
      retryDatasetUpload: jest.fn(),
      readModelState: 'ready',
      readModelStatus: null,
      readModelError: null,
      readModelPollingTimedOut: false,
      retryReadModelState: jest.fn(),
      breakdownOpen: false,
      setBreakdownOpen: jest.fn(),
      overviewData: null,
      overviewLoading: false,
      overviewError: null,
      retryOverview: jest.fn(),
      majorsData: null,
      majorsLoading: false,
      majorsError: null,
      majorsFilters: {},
      setMajorsFilters: jest.fn(),
      majorsFilterOptions: {
        academicPeriodOptions: [],
        schoolOptions: [],
        studentTypeOptions: [],
      },
      retryMajors: jest.fn(),
      migrationData: null,
      migrationLoading: false,
      migrationError: null,
      migrationSemester: undefined,
      setMigrationSemester: jest.fn(),
      retryMigration: jest.fn(),
      forecastsData: null,
      forecastsLoading: false,
      forecastsError: null,
      forecastHorizon: 4,
      setForecastHorizon: jest.fn(),
      retryForecasts: jest.fn(),
    } as const;

    render(<DashboardTabs model={props} />);

    expect(
      screen.queryByRole('button', { name: 'Go to latest available' })
    ).not.toBeInTheDocument();
  });

  test('renders coverage warning details and link to admin backfill tools', () => {
    const props = {
      selectedDate: new Date('2026-02-11'),
      setSelectedDate: jest.fn(),
      currentDataDate: '2026-02-11',
      availableSnapshotDates: [new Date('2026-02-11')],
      snapshotDatesLoading: false,
      snapshotDatesError: null,
      snapshotDateEmptyState: null,
      snapshotCoverage: {
        minEffectiveDate: '2026-01-29',
        maxEffectiveDate: '2026-02-11',
        rangeStartDate: '2026-01-29',
        rangeEndDate: '2026-02-11',
        missingWeekdays: [
          '2026-02-03',
          '2026-02-04',
          '2026-02-05',
          '2026-02-06',
          '2026-02-09',
          '2026-02-10',
        ],
        missingWeekdayCount: 6,
      },
      snapshotCoverageLoading: false,
      snapshotCoverageError: null,
      snapshotCoverageRangeDays: 14,
      latestAvailableSnapshotDate: '2026-02-11',
      canGoToLatestAvailableDate: false,
      goToLatestAvailableDate: jest.fn(),
      handleDatasetUpload: jest.fn(),
      uploadLoading: false,
      uploadError: null,
      uploadFeedback: null,
      uploadRetryAvailable: false,
      retryDatasetUpload: jest.fn(),
      readModelState: 'ready',
      readModelStatus: null,
      readModelError: null,
      readModelPollingTimedOut: false,
      retryReadModelState: jest.fn(),
      breakdownOpen: false,
      setBreakdownOpen: jest.fn(),
      overviewData: null,
      overviewLoading: false,
      overviewError: null,
      retryOverview: jest.fn(),
      majorsData: null,
      majorsLoading: false,
      majorsError: null,
      majorsFilters: {},
      setMajorsFilters: jest.fn(),
      majorsFilterOptions: {
        academicPeriodOptions: [],
        schoolOptions: [],
        studentTypeOptions: [],
      },
      retryMajors: jest.fn(),
      migrationData: null,
      migrationLoading: false,
      migrationError: null,
      migrationSemester: undefined,
      setMigrationSemester: jest.fn(),
      retryMigration: jest.fn(),
      forecastsData: null,
      forecastsLoading: false,
      forecastsError: null,
      forecastHorizon: 4,
      setForecastHorizon: jest.fn(),
      retryForecasts: jest.fn(),
    } as const;

    render(<DashboardTabs model={props} />);

    expect(screen.getByText('Missing weekdays: 6')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Missing weekday dates: 2026-02-03, 2026-02-04, 2026-02-05, 2026-02-06, 2026-02-09 \(\+1 more\)\./
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open Admin Console backfill tools' })
    ).toHaveAttribute(
      'href',
      '/admin-console#admin-bulk-backfill-monitor-heading'
    );
  });

  test('renders warning fallback when missing weekday count is present but dates are unavailable', () => {
    const props = {
      selectedDate: new Date('2026-02-11'),
      setSelectedDate: jest.fn(),
      currentDataDate: '2026-02-11',
      availableSnapshotDates: [new Date('2026-02-11')],
      snapshotDatesLoading: false,
      snapshotDatesError: null,
      snapshotDateEmptyState: null,
      snapshotCoverage: {
        missingWeekdays: [],
        missingWeekdayCount: 3,
      },
      snapshotCoverageLoading: false,
      snapshotCoverageError: null,
      snapshotCoverageRangeDays: 14,
      latestAvailableSnapshotDate: '2026-02-11',
      canGoToLatestAvailableDate: false,
      goToLatestAvailableDate: jest.fn(),
      handleDatasetUpload: jest.fn(),
      uploadLoading: false,
      uploadError: null,
      uploadFeedback: null,
      uploadRetryAvailable: false,
      retryDatasetUpload: jest.fn(),
      readModelState: 'ready',
      readModelStatus: null,
      readModelError: null,
      readModelPollingTimedOut: false,
      retryReadModelState: jest.fn(),
      breakdownOpen: false,
      setBreakdownOpen: jest.fn(),
      overviewData: null,
      overviewLoading: false,
      overviewError: null,
      retryOverview: jest.fn(),
      majorsData: null,
      majorsLoading: false,
      majorsError: null,
      majorsFilters: {},
      setMajorsFilters: jest.fn(),
      majorsFilterOptions: {
        academicPeriodOptions: [],
        schoolOptions: [],
        studentTypeOptions: [],
      },
      retryMajors: jest.fn(),
      migrationData: null,
      migrationLoading: false,
      migrationError: null,
      migrationSemester: undefined,
      setMigrationSemester: jest.fn(),
      retryMigration: jest.fn(),
      forecastsData: null,
      forecastsLoading: false,
      forecastsError: null,
      forecastHorizon: 4,
      setForecastHorizon: jest.fn(),
      retryForecasts: jest.fn(),
    } as const;

    render(<DashboardTabs model={props} />);

    expect(screen.getByText('Missing weekdays: 3')).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => {
        if (!element) {
          return false;
        }
        return (
          element.tagName.toLowerCase() === 'p' &&
          element.textContent?.includes('Missing weekday dates unavailable.') ===
            true
        );
      })
    ).toBeInTheDocument();
    expect(screen.queryByText(/Missing weekday dates:/)).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open Admin Console backfill tools' })
    ).toBeInTheDocument();
  });

  test('renders coverage unavailable status when coverage request fails', () => {
    const props = {
      selectedDate: new Date('2026-02-11'),
      setSelectedDate: jest.fn(),
      currentDataDate: '2026-02-11',
      availableSnapshotDates: [new Date('2026-02-11')],
      snapshotDatesLoading: false,
      snapshotDatesError: null,
      snapshotDateEmptyState: null,
      snapshotCoverage: null,
      snapshotCoverageLoading: false,
      snapshotCoverageError: {
        code: 'NETWORK_ERROR',
        message: 'Unable to load snapshot coverage status.',
        retryable: true,
      },
      snapshotCoverageRangeDays: 14,
      latestAvailableSnapshotDate: '2026-02-11',
      canGoToLatestAvailableDate: false,
      goToLatestAvailableDate: jest.fn(),
      handleDatasetUpload: jest.fn(),
      uploadLoading: false,
      uploadError: null,
      uploadFeedback: null,
      uploadRetryAvailable: false,
      retryDatasetUpload: jest.fn(),
      readModelState: 'ready',
      readModelStatus: null,
      readModelError: null,
      readModelPollingTimedOut: false,
      retryReadModelState: jest.fn(),
      breakdownOpen: false,
      setBreakdownOpen: jest.fn(),
      overviewData: null,
      overviewLoading: false,
      overviewError: null,
      retryOverview: jest.fn(),
      majorsData: null,
      majorsLoading: false,
      majorsError: null,
      majorsFilters: {},
      setMajorsFilters: jest.fn(),
      majorsFilterOptions: {
        academicPeriodOptions: [],
        schoolOptions: [],
        studentTypeOptions: [],
      },
      retryMajors: jest.fn(),
      migrationData: null,
      migrationLoading: false,
      migrationError: null,
      migrationSemester: undefined,
      setMigrationSemester: jest.fn(),
      retryMigration: jest.fn(),
      forecastsData: null,
      forecastsLoading: false,
      forecastsError: null,
      forecastHorizon: 4,
      setForecastHorizon: jest.fn(),
      retryForecasts: jest.fn(),
    } as const;

    render(<DashboardTabs model={props} />);

    expect(screen.getByText('Coverage unavailable')).toBeInTheDocument();
  });

  test('renders coverage loading status chip while coverage is being fetched', () => {
    const props = {
      selectedDate: new Date('2026-02-11'),
      setSelectedDate: jest.fn(),
      currentDataDate: '2026-02-11',
      availableSnapshotDates: [new Date('2026-02-11')],
      snapshotDatesLoading: false,
      snapshotDatesError: null,
      snapshotDateEmptyState: null,
      snapshotCoverage: null,
      snapshotCoverageLoading: true,
      snapshotCoverageError: null,
      snapshotCoverageRangeDays: 14,
      latestAvailableSnapshotDate: '2026-02-11',
      canGoToLatestAvailableDate: false,
      goToLatestAvailableDate: jest.fn(),
      handleDatasetUpload: jest.fn(),
      uploadLoading: false,
      uploadError: null,
      uploadFeedback: null,
      uploadRetryAvailable: false,
      retryDatasetUpload: jest.fn(),
      readModelState: 'ready',
      readModelStatus: null,
      readModelError: null,
      readModelPollingTimedOut: false,
      retryReadModelState: jest.fn(),
      breakdownOpen: false,
      setBreakdownOpen: jest.fn(),
      overviewData: null,
      overviewLoading: false,
      overviewError: null,
      retryOverview: jest.fn(),
      majorsData: null,
      majorsLoading: false,
      majorsError: null,
      majorsFilters: {},
      setMajorsFilters: jest.fn(),
      majorsFilterOptions: {
        academicPeriodOptions: [],
        schoolOptions: [],
        studentTypeOptions: [],
      },
      retryMajors: jest.fn(),
      migrationData: null,
      migrationLoading: false,
      migrationError: null,
      migrationSemester: undefined,
      setMigrationSemester: jest.fn(),
      retryMigration: jest.fn(),
      forecastsData: null,
      forecastsLoading: false,
      forecastsError: null,
      forecastHorizon: 4,
      setForecastHorizon: jest.fn(),
      retryForecasts: jest.fn(),
    } as const;

    render(<DashboardTabs model={props} />);

    expect(screen.getByText('Checking last 14 days…')).toBeInTheDocument();
  });

  test('renders warning details without overflow suffix when <= 5 dates are missing', () => {
    const props = {
      selectedDate: new Date('2026-02-11'),
      setSelectedDate: jest.fn(),
      currentDataDate: '2026-02-11',
      availableSnapshotDates: [new Date('2026-02-11')],
      snapshotDatesLoading: false,
      snapshotDatesError: null,
      snapshotDateEmptyState: null,
      snapshotCoverage: {
        minEffectiveDate: '2026-01-29',
        maxEffectiveDate: '2026-02-11',
        rangeStartDate: '2026-01-29',
        rangeEndDate: '2026-02-11',
        missingWeekdays: ['2026-02-03', '2026-02-04'],
        missingWeekdayCount: 2,
      },
      snapshotCoverageLoading: false,
      snapshotCoverageError: null,
      snapshotCoverageRangeDays: 14,
      latestAvailableSnapshotDate: '2026-02-11',
      canGoToLatestAvailableDate: false,
      goToLatestAvailableDate: jest.fn(),
      handleDatasetUpload: jest.fn(),
      uploadLoading: false,
      uploadError: null,
      uploadFeedback: null,
      uploadRetryAvailable: false,
      retryDatasetUpload: jest.fn(),
      readModelState: 'ready',
      readModelStatus: null,
      readModelError: null,
      readModelPollingTimedOut: false,
      retryReadModelState: jest.fn(),
      breakdownOpen: false,
      setBreakdownOpen: jest.fn(),
      overviewData: null,
      overviewLoading: false,
      overviewError: null,
      retryOverview: jest.fn(),
      majorsData: null,
      majorsLoading: false,
      majorsError: null,
      majorsFilters: {},
      setMajorsFilters: jest.fn(),
      majorsFilterOptions: {
        academicPeriodOptions: [],
        schoolOptions: [],
        studentTypeOptions: [],
      },
      retryMajors: jest.fn(),
      migrationData: null,
      migrationLoading: false,
      migrationError: null,
      migrationSemester: undefined,
      setMigrationSemester: jest.fn(),
      retryMigration: jest.fn(),
      forecastsData: null,
      forecastsLoading: false,
      forecastsError: null,
      forecastHorizon: 4,
      setForecastHorizon: jest.fn(),
      retryForecasts: jest.fn(),
    } as const;

    render(<DashboardTabs model={props} />);

    expect(
      screen.getByText((_, element) => {
        if (!element) {
          return false;
        }
        return (
          element.tagName.toLowerCase() === 'p' &&
          element.textContent?.includes(
            'Missing weekday dates: 2026-02-03, 2026-02-04.'
          ) === true
        );
      })
    ).toBeInTheDocument();
    expect(screen.queryByText(/\(\+/)).not.toBeInTheDocument();
  });
});
