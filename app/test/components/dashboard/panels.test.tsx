import { fireEvent, render, screen } from '@testing-library/react';
import { DashboardNoDatasetState } from '@/features/dashboard/components/DashboardNoDatasetState';
import { ForecastsPanel } from '@/features/dashboard/components/panels/ForecastsPanel';
import { MajorsPanel } from '@/features/dashboard/components/panels/MajorsPanel';
import { MigrationPanel } from '@/features/dashboard/components/panels/MigrationPanel';
import { OverviewPanel } from '@/features/dashboard/components/panels/OverviewPanel';
import {
  PanelEmptyState,
  PanelErrorState,
  PanelFailedState,
  PanelLoadingState,
  PanelProcessingState,
} from '@/features/dashboard/components/panels/PanelStates';

jest.mock('@/shared/ui/tabs', () => ({
  TabsContent: ({ children, ...props }: { children: React.ReactNode }) => (
    <div {...props}>{children}</div>
  ),
}));

jest.mock('@/features/upload/components/UploadDatasetButton', () => ({
  UploadDatasetButton: ({
    onDatasetUpload,
    buttonLabel = 'Upload Dataset',
  }: {
    onDatasetUpload: (file: File) => void;
    buttonLabel?: string;
  }) => (
    <button
      onClick={() => {
        onDatasetUpload(new File(['csv'], 'dataset.csv', { type: 'text/csv' }));
      }}
    >
      {buttonLabel}
    </button>
  ),
}));

jest.mock('@/features/metrics/components/MetricsSummaryCard', () => ({
  MetricsSummaryCard: ({
    title,
    value,
    onClick,
  }: {
    title: string;
    value: string | number;
    onClick?: () => void;
  }) => <button onClick={onClick}>{`${title}: ${value}`}</button>,
}));

jest.mock('@/features/metrics/components/AnalyticsBreakdownModal', () => ({
  AnalyticsBreakdownModal: ({ open }: { open: boolean }) => (
    <div data-testid="analytics-breakdown-modal">
      {open ? 'open' : 'closed'}
    </div>
  ),
}));

jest.mock('@/features/metrics/components/charts/MetricsTrendChart', () => ({
  MetricsTrendChart: ({
    data,
  }: {
    data: Array<{ period: string; total: number }>;
  }) => <div>{`Trend points: ${data.length}`}</div>,
}));

jest.mock(
  '@/features/metrics/components/charts/StudentTypeDistributionChart',
  () => ({
    StudentTypeDistributionChart: ({
      data,
    }: {
      data: Array<{ type: string; count: number }>;
    }) => <div>{`Student type points: ${data.length}`}</div>,
  })
);

jest.mock(
  '@/features/metrics/components/charts/SchoolDistributionChart',
  () => ({
    SchoolDistributionChart: ({
      data,
    }: {
      data: Array<{ school: string; count: number }>;
    }) => <div>{`School points: ${data.length}`}</div>,
  })
);

jest.mock('@/features/metrics/components/CohortSummaryTable', () => ({
  CohortSummaryTable: ({ data }: { data: Array<{ major: string }> }) => (
    <div>{`Cohort rows: ${data.length}`}</div>
  ),
}));

jest.mock(
  '@/features/metrics/components/charts/MajorDistributionChart',
  () => ({
    MajorDistributionChart: ({
      data,
    }: {
      data: Array<{ major: string; count: number }>;
    }) => <div>{`Major points: ${data.length}`}</div>,
  })
);

jest.mock('@/features/metrics/components/major-analytics-charts', () => ({
  AvgCreditsByCohortChart: ({ data }: { data: unknown[] }) => (
    <div>{`credits-by-cohort:${data.length}`}</div>
  ),
  AvgCreditsByMajorChart: ({ data }: { data: unknown[] }) => (
    <div>{`credits-by-major:${data.length}`}</div>
  ),
  AvgGPAByCohortChart: ({ data }: { data: unknown[] }) => (
    <div>{`gpa-by-cohort:${data.length}`}</div>
  ),
  AvgGPAByMajorChart: ({ data }: { data: unknown[] }) => (
    <div>{`gpa-by-major:${data.length}`}</div>
  ),
}));

jest.mock('@/features/metrics/components/charts/MigrationFlowChart', () => ({
  MigrationFlowChart: ({ data }: { data: unknown[] }) => (
    <div>{`Migration flow rows: ${data.length}`}</div>
  ),
}));

jest.mock('@/features/metrics/components/MigrationTopFlowsTable', () => ({
  MigrationTopFlowsTable: ({ data }: { data: unknown[] }) => (
    <div>{`Migration table rows: ${data.length}`}</div>
  ),
}));

jest.mock('@/features/filters/components/SemesterFilterSelect', () => ({
  SemesterFilterSelect: ({
    options,
    onValueChange,
  }: {
    options: string[];
    onValueChange: (value: string | undefined) => void;
  }) => (
    <button onClick={() => onValueChange(options[0])}>
      {`Semester options: ${options.length}`}
    </button>
  ),
}));

jest.mock('@/shared/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
  }) => (
    <div>
      <button
        onClick={() => {
          onValueChange?.('6');
        }}
      >
        Trigger Select Value
      </button>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, ...props }: { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('@/features/metrics/components/ForecastSection', () => ({
  ForecastSection: ({
    historicalData,
    forecastData,
  }: {
    historicalData: unknown[];
    forecastData: unknown[];
  }) => (
    <div>{`Forecast section: ${historicalData.length}/${forecastData.length}`}</div>
  ),
}));

describe('dashboard panel states', () => {
  test('PanelLoadingState, PanelProcessingState, PanelFailedState, PanelErrorState, and PanelEmptyState render', () => {
    const retry = jest.fn();
    const refresh = jest.fn();

    const { rerender } = render(
      <PanelLoadingState message="Loading dashboard segment..." />
    );
    expect(
      screen.getByText('Loading dashboard segment...')
    ).toBeInTheDocument();

    rerender(
      <PanelProcessingState
        message="Processing dataset..."
        status="building"
        onRefresh={refresh}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Current status: building.')).toBeInTheDocument();

    rerender(
      <PanelProcessingState
        message="Processing dataset..."
        onRefresh={refresh}
      />
    );
    expect(screen.queryByText(/Current status:/)).not.toBeInTheDocument();

    rerender(<PanelProcessingState onRefresh={refresh} />);
    expect(
      screen.getByText(
        'Dataset processing is in progress. Analytics will refresh automatically when ready.'
      )
    ).toBeInTheDocument();

    rerender(
      <PanelFailedState message="Processing failed" onRefresh={refresh} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(refresh).toHaveBeenCalledTimes(2);

    rerender(<PanelErrorState message="Segment failed" onRetry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledTimes(1);

    rerender(
      <PanelEmptyState
        title="No data"
        description="This panel has no records yet."
      />
    );
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(
      screen.getByText('This panel has no records yet.')
    ).toBeInTheDocument();
  });

  test('OverviewPanel handles loading, error, empty, and populated states', () => {
    const onRetry = jest.fn();
    const onReadModelRetry = jest.fn();
    const onDatasetUpload = jest.fn();
    const onBreakdownOpenChange = jest.fn();
    const onRetryUpload = jest.fn();

    const baseProps = {
      currentDataDate: '2026-02-11',
      onDatasetUpload,
      uploadLoading: false,
      uploadError: null,
      uploadFeedback: null,
      uploadRetryAvailable: false,
      onRetryUpload,
      breakdownOpen: false,
      onBreakdownOpenChange,
      onRetry,
      readModelState: 'ready' as const,
      readModelStatus: null,
      readModelError: null,
      readModelPollingTimedOut: false,
      onReadModelRetry,
    };

    const { rerender } = render(
      <OverviewPanel {...baseProps} data={null} loading={true} error={null} />
    );
    expect(screen.getByText('Loading overview metrics...')).toBeInTheDocument();

    rerender(
      <OverviewPanel
        {...baseProps}
        data={null}
        loading={false}
        error={{ code: 'UNKNOWN', message: 'Overview failed', retryable: true }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(
      <OverviewPanel
        {...baseProps}
        data={null}
        loading={false}
        error={null}
        readModelState="processing"
        readModelStatus="building"
        readModelPollingTimedOut={false}
      />
    );
    expect(
      screen.getByText(
        'Dataset processing is in progress. Overview metrics will refresh automatically when ready.'
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(onReadModelRetry).toHaveBeenCalledTimes(1);

    rerender(
      <OverviewPanel
        {...baseProps}
        data={null}
        loading={false}
        error={null}
        readModelState="processing"
        readModelStatus="building"
        readModelPollingTimedOut={true}
      />
    );
    expect(screen.getByText(/Dataset is still processing/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(onReadModelRetry).toHaveBeenCalledTimes(2);

    rerender(
      <OverviewPanel
        {...baseProps}
        data={null}
        loading={false}
        error={null}
        readModelState="failed"
        readModelStatus="failed"
        readModelPollingTimedOut={false}
        readModelError={{
          code: 'DATASET_FAILED',
          message: 'Dataset processing failed.',
          retryable: false,
          status: 409,
        }}
      />
    );
    expect(screen.getByText('Dataset processing failed.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(onReadModelRetry).toHaveBeenCalledTimes(3);
    fireEvent.click(screen.getByRole('button', { name: 'Upload Dataset' }));
    expect(onDatasetUpload).toHaveBeenCalledTimes(1);

    rerender(
      <OverviewPanel
        {...baseProps}
        data={null}
        loading={false}
        error={null}
        readModelState="failed"
        readModelStatus="failed"
        readModelPollingTimedOut={false}
        readModelError={null}
      />
    );
    expect(
      screen.getByText(
        'Dataset processing failed. Upload a new dataset to continue.'
      )
    ).toBeInTheDocument();

    rerender(
      <OverviewPanel {...baseProps} data={null} loading={false} error={null} />
    );
    expect(
      screen.getByText('No overview metrics available')
    ).toBeInTheDocument();

    rerender(
      <OverviewPanel
        {...baseProps}
        data={{
          datasetId: 'dataset-1',
          snapshotTotals: {
            total: 1200,
            undergrad: 1000,
            ftic: 400,
            transfer: 250,
            international: 144,
          },
          activeMajors: 17,
          activeSchools: 6,
          studentTypeDistribution: [{ type: 'FTIC', count: 400 }],
          schoolDistribution: [{ school: 'School of Business', count: 320 }],
          trend: [
            {
              period: 'Fall 2025',
              year: 2025,
              semester: 'Fall',
              total: 1190,
            },
          ],
        }}
        loading={false}
        error={null}
        uploadLoading={true}
        uploadError={{
          code: 'UPLOAD_FAILED',
          message: 'Upload API not ready',
          retryable: true,
          status: 422,
        }}
        uploadFeedback={{
          phase: 'failed',
          fileName: 'dataset.csv',
          submissionStatus: 'failed',
          submissionId: 'sub-1',
          datasetId: 'dataset-1',
          inferredEffectiveDate: '2026-02-11',
          inferredEffectiveDatetime: '2026-02-11T15:00:00Z',
          validationErrors: [
            {
              code: 'VALIDATION_FAILED',
              message: 'Current Moment values are inconsistent.',
            },
          ],
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Upload API not ready',
            retryable: true,
            status: 422,
          },
        }}
        uploadRetryAvailable={false}
      />
    );

    expect(screen.getByText('Upload failed')).toBeInTheDocument();
    expect(screen.getByText('Upload API not ready')).toBeInTheDocument();
    expect(screen.getByText(/Inferred effective date:/)).toBeInTheDocument();
    expect(screen.getByText('2026-02-11')).toBeInTheDocument();
    expect(screen.getByText(/Submission status:/)).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
    expect(
      screen.getByText('Stage-based upload progress: 100%.')
    ).toBeInTheDocument();
    expect(screen.getByText('Error code:')).toBeInTheDocument();
    expect(screen.getByText('VALIDATION_FAILED')).toBeInTheDocument();
    expect(
      screen.getByText(
        /If the error references Current Moment \(DateTime\), ensure every row has the same value/
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Retry upload' })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Trend points: 1')).toBeInTheDocument();
    expect(screen.getByText('Student type points: 1')).toBeInTheDocument();
    expect(screen.getByText('School points: 1')).toBeInTheDocument();
    expect(screen.getByText(/Current data date:/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Total Students:/ }));
    expect(onBreakdownOpenChange).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: 'Upload Dataset' }));
    expect(onDatasetUpload).toHaveBeenCalledTimes(2);
  });

  test('OverviewPanel shows unavailable current data date for malformed dates', () => {
    const baseProps = {
      onDatasetUpload: jest.fn(),
      uploadLoading: false,
      uploadError: null,
      uploadFeedback: null,
      uploadRetryAvailable: false,
      onRetryUpload: jest.fn(),
      breakdownOpen: false,
      onBreakdownOpenChange: jest.fn(),
      data: null,
      loading: false,
      error: null,
      onRetry: jest.fn(),
      readModelState: 'ready' as const,
      readModelStatus: null,
      readModelError: null,
      readModelPollingTimedOut: false,
      onReadModelRetry: jest.fn(),
    };

    const { rerender } = render(
      <OverviewPanel {...baseProps} currentDataDate="bad-date" />
    );
    expect(
      screen.getByText('Current data date: Unavailable')
    ).toBeInTheDocument();

    rerender(<OverviewPanel {...baseProps} currentDataDate={null} />);
    expect(
      screen.getByText('Current data date: Unavailable')
    ).toBeInTheDocument();

    rerender(<OverviewPanel {...baseProps} currentDataDate="2026-02-31" />);
    expect(
      screen.getByText('Current data date: Unavailable')
    ).toBeInTheDocument();
  });

  test('DashboardNoDatasetState shows conflict guidance using backend effective date and IDs', () => {
    render(
      <DashboardNoDatasetState
        onDatasetUpload={jest.fn()}
        uploadLoading={false}
        uploadError={{
          code: 'EFFECTIVE_DATE_UPLOAD_LIMIT',
          message: 'An upload already exists for that effective date.',
          retryable: false,
          status: 409,
        }}
        uploadFeedback={{
          phase: 'failed',
          fileName: 'conflict.csv',
          submissionStatus: null,
          submissionId: 'sub-existing',
          datasetId: 'ds-existing',
          inferredEffectiveDate: '2026-02-10',
          inferredEffectiveDatetime: null,
          validationErrors: [],
          error: {
            code: 'EFFECTIVE_DATE_UPLOAD_LIMIT',
            message: 'An upload already exists for that effective date.',
            retryable: false,
            status: 409,
          },
        }}
        uploadRetryAvailable={false}
        onRetryUpload={jest.fn()}
      />
    );

    expect(screen.getByText('Upload failed')).toBeInTheDocument();
    expect(
      screen.getByText('An upload already exists for 2026-02-10.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Open the Admin Console to inspect the existing submission and snapshot for that date.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open Admin Console' })
    ).toHaveAttribute('href', '/admin-console');
    expect(
      screen.getByText('Existing submission: sub-existing.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Retry upload' })
    ).not.toBeInTheDocument();
  });

  test('MajorsPanel handles loading/error/empty and renders populated data', () => {
    const onRetry = jest.fn();
    const onReadModelRetry = jest.fn();
    const onFiltersChange = jest.fn();
    const defaultFilterProps = {
      filters: {},
      onFiltersChange,
      academicPeriodOptions: [] as string[],
      schoolOptions: [] as string[],
      studentTypeOptions: [] as string[],
    };

    const { rerender } = render(
      <MajorsPanel
        data={null}
        loading={true}
        error={null}
        onRetry={onRetry}
        {...defaultFilterProps}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(screen.getByText('Loading majors analytics...')).toBeInTheDocument();

    rerender(
      <MajorsPanel
        data={null}
        loading={false}
        error={{ code: 'UNKNOWN', message: 'Majors failed', retryable: true }}
        onRetry={onRetry}
        {...defaultFilterProps}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(
      <MajorsPanel
        data={null}
        loading={false}
        error={null}
        onRetry={onRetry}
        {...defaultFilterProps}
        readModelState="processing"
        readModelStatus="building"
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(
      screen.getByText(
        'Dataset processing is in progress. Majors analytics will refresh automatically when ready.'
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(onReadModelRetry).toHaveBeenCalledTimes(1);

    rerender(
      <MajorsPanel
        data={null}
        loading={false}
        error={null}
        onRetry={onRetry}
        {...defaultFilterProps}
        readModelState="processing"
        readModelStatus="building"
        readModelError={null}
        readModelPollingTimedOut={true}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(screen.getByText(/Dataset is still processing/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(onReadModelRetry).toHaveBeenCalledTimes(2);

    rerender(
      <MajorsPanel
        data={null}
        loading={false}
        error={null}
        onRetry={onRetry}
        {...defaultFilterProps}
        readModelState="failed"
        readModelStatus="failed"
        readModelError={{
          code: 'DATASET_FAILED',
          message: 'Dataset processing failed.',
          retryable: false,
          status: 409,
        }}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(screen.getByText('Dataset processing failed.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(onReadModelRetry).toHaveBeenCalledTimes(3);

    rerender(
      <MajorsPanel
        data={null}
        loading={false}
        error={null}
        onRetry={onRetry}
        {...defaultFilterProps}
        readModelState="failed"
        readModelStatus="failed"
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(
      screen.getByText(
        'Dataset processing failed. Upload a new dataset to continue.'
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(onReadModelRetry).toHaveBeenCalledTimes(4);

    rerender(
      <MajorsPanel
        data={null}
        loading={false}
        error={null}
        onRetry={onRetry}
        {...defaultFilterProps}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(
      screen.getByText('No majors analytics available')
    ).toBeInTheDocument();

    rerender(
      <MajorsPanel
        data={{
          datasetId: 'dataset-1',
          analyticsRecords: [],
          majorDistribution: [
            { major: 'Biology', count: 150 },
            { major: 'Chemistry', count: 50 },
          ],
          cohortRecords: [
            {
              major: 'Biology',
              cohort: 'FTIC 2024',
              avgGPA: 3.2,
              avgCredits: 14,
              studentCount: 150,
            },
          ],
        }}
        loading={false}
        error={null}
        onRetry={onRetry}
        {...defaultFilterProps}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(screen.getByText('Top Major: Biology')).toBeInTheDocument();
    expect(screen.getByText('Total Programs: 2')).toBeInTheDocument();
    expect(screen.getByText('Avg per Major: 100')).toBeInTheDocument();
    expect(screen.getByText('Major points: 2')).toBeInTheDocument();
    expect(screen.getByText('Cohort rows: 1')).toBeInTheDocument();

    rerender(
      <MajorsPanel
        data={{
          datasetId: 'dataset-2',
          analyticsRecords: [],
          majorDistribution: [],
          cohortRecords: [],
        }}
        loading={false}
        error={null}
        onRetry={onRetry}
        {...defaultFilterProps}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(screen.getByText('Top Major: N/A')).toBeInTheDocument();
    expect(screen.getByText('Avg per Major: 0')).toBeInTheDocument();
  });

  test('MajorsPanel shows filter panel when data is available and empty state when filters yield no results', () => {
    const onRetry = jest.fn();
    const onReadModelRetry = jest.fn();
    const onFiltersChange = jest.fn();

    const { rerender } = render(
      <MajorsPanel
        data={{
          datasetId: 'dataset-1',
          analyticsRecords: [],
          majorDistribution: [{ major: 'Biology', count: 100 }],
          cohortRecords: [],
        }}
        loading={false}
        error={null}
        onRetry={onRetry}
        filters={{}}
        onFiltersChange={onFiltersChange}
        academicPeriodOptions={['Fall 2025', 'Spring 2026']}
        schoolOptions={['School of Engineering']}
        studentTypeOptions={['FTIC', 'Transfer']}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );

    expect(screen.getByTestId('majors-filter-panel')).toBeInTheDocument();
    expect(screen.getByLabelText('Select semester')).toBeInTheDocument();
    expect(screen.getByLabelText('Select school')).toBeInTheDocument();
    expect(screen.getByLabelText('Select student type')).toBeInTheDocument();

    rerender(
      <MajorsPanel
        data={{
          datasetId: 'dataset-1',
          analyticsRecords: [],
          majorDistribution: [],
          cohortRecords: [],
        }}
        loading={false}
        error={null}
        onRetry={onRetry}
        filters={{ academicPeriod: 'Fall 2025' }}
        onFiltersChange={onFiltersChange}
        academicPeriodOptions={['Fall 2025', 'Spring 2026']}
        schoolOptions={['School of Engineering']}
        studentTypeOptions={['FTIC', 'Transfer']}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );

    expect(
      screen.getByText('No results for selected filters')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Try adjusting your semester, school, or student type filters.'
      )
    ).toBeInTheDocument();
  });

  test('MajorsPanel hides filter panel when data is null', () => {
    render(
      <MajorsPanel
        data={null}
        loading={false}
        error={null}
        onRetry={jest.fn()}
        filters={{}}
        onFiltersChange={jest.fn()}
        academicPeriodOptions={[]}
        schoolOptions={[]}
        studentTypeOptions={[]}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={jest.fn()}
      />
    );

    expect(screen.queryByTestId('majors-filter-panel')).not.toBeInTheDocument();
  });

  test('MigrationPanel handles states and semester change callback', () => {
    const onRetry = jest.fn();
    const onReadModelRetry = jest.fn();
    const onSemesterChange = jest.fn();

    const { rerender } = render(
      <MigrationPanel
        data={null}
        loading={true}
        error={null}
        migrationSemester={undefined}
        onSemesterChange={onSemesterChange}
        onRetry={onRetry}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(
      screen.getByText('Loading migration analytics...')
    ).toBeInTheDocument();

    rerender(
      <MigrationPanel
        data={null}
        loading={false}
        error={{
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Migration failed',
          retryable: false,
          status: 500,
        }}
        migrationSemester={undefined}
        onSemesterChange={onSemesterChange}
        onRetry={onRetry}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(
      <MigrationPanel
        data={null}
        loading={false}
        error={null}
        migrationSemester={undefined}
        onSemesterChange={onSemesterChange}
        onRetry={onRetry}
        readModelState="processing"
        readModelStatus="building"
        readModelError={null}
        readModelPollingTimedOut={true}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(screen.getByText(/Dataset is still processing/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(onReadModelRetry).toHaveBeenCalledTimes(1);

    rerender(
      <MigrationPanel
        data={null}
        loading={false}
        error={null}
        migrationSemester={undefined}
        onSemesterChange={onSemesterChange}
        onRetry={onRetry}
        readModelState="processing"
        readModelStatus="building"
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(
      screen.getByText(
        'Dataset processing is in progress. Migration analytics will refresh automatically when ready.'
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(onReadModelRetry).toHaveBeenCalledTimes(2);

    rerender(
      <MigrationPanel
        data={null}
        loading={false}
        error={null}
        migrationSemester={undefined}
        onSemesterChange={onSemesterChange}
        onRetry={onRetry}
        readModelState="failed"
        readModelStatus="failed"
        readModelError={{
          code: 'DATASET_FAILED',
          message: 'Dataset processing failed.',
          retryable: false,
          status: 409,
        }}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(onReadModelRetry).toHaveBeenCalledTimes(3);

    rerender(
      <MigrationPanel
        data={null}
        loading={false}
        error={null}
        migrationSemester={undefined}
        onSemesterChange={onSemesterChange}
        onRetry={onRetry}
        readModelState="failed"
        readModelStatus="failed"
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(
      screen.getByText(
        'Dataset processing failed. Upload a new dataset to continue.'
      )
    ).toBeInTheDocument();

    rerender(
      <MigrationPanel
        data={null}
        loading={false}
        error={null}
        migrationSemester={undefined}
        onSemesterChange={onSemesterChange}
        onRetry={onRetry}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(
      screen.getByText('No migration analytics available')
    ).toBeInTheDocument();

    rerender(
      <MigrationPanel
        data={{
          datasetId: 'dataset-1',
          semesters: ['Fall 2025'],
          records: [],
        }}
        loading={false}
        error={null}
        migrationSemester="Fall 2025"
        onSemesterChange={onSemesterChange}
        onRetry={onRetry}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(
      screen.getByText('No migration detected for selected period')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Migration flow rows: 0')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Migration table rows: 0')
    ).not.toBeInTheDocument();

    rerender(
      <MigrationPanel
        data={{
          datasetId: 'dataset-1',
          semesters: ['Fall 2025'],
          records: [
            {
              fromMajor: 'Biology',
              toMajor: 'Chemistry',
              semester: 'Fall 2025',
              count: 14,
            },
          ],
        }}
        loading={false}
        error={null}
        migrationSemester="Fall 2025"
        onSemesterChange={onSemesterChange}
        onRetry={onRetry}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );

    expect(screen.getByText('Semester options: 1')).toBeInTheDocument();
    expect(screen.getByText('Migration flow rows: 1')).toBeInTheDocument();
    expect(screen.getByText('Migration table rows: 1')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Semester options: 1' })
    );
    expect(onSemesterChange).toHaveBeenCalledWith('Fall 2025');
  });

  test('ForecastsPanel handles states and both growth sign branches', () => {
    const onRetry = jest.fn();
    const onReadModelRetry = jest.fn();
    const onHorizonChange = jest.fn();

    const { rerender } = render(
      <ForecastsPanel
        data={null}
        loading={true}
        error={null}
        horizon={4}
        onHorizonChange={onHorizonChange}
        onRetry={onRetry}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(
      screen.getByText('Loading forecast analytics...')
    ).toBeInTheDocument();

    rerender(
      <ForecastsPanel
        data={null}
        loading={false}
        error={{ code: 'UNKNOWN', message: 'Forecast failed', retryable: true }}
        horizon={4}
        onHorizonChange={onHorizonChange}
        onRetry={onRetry}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(
      <ForecastsPanel
        data={null}
        loading={false}
        error={null}
        horizon={4}
        onHorizonChange={onHorizonChange}
        onRetry={onRetry}
        readModelState="processing"
        readModelStatus="building"
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(
      screen.getByText(
        'Dataset processing is in progress. Forecast analytics will refresh automatically when ready.'
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(onReadModelRetry).toHaveBeenCalledTimes(1);

    rerender(
      <ForecastsPanel
        data={null}
        loading={false}
        error={null}
        horizon={4}
        onHorizonChange={onHorizonChange}
        onRetry={onRetry}
        readModelState="processing"
        readModelStatus="building"
        readModelError={null}
        readModelPollingTimedOut={true}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(screen.getByText(/Dataset is still processing/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(onReadModelRetry).toHaveBeenCalledTimes(2);

    rerender(
      <ForecastsPanel
        data={null}
        loading={false}
        error={null}
        horizon={4}
        onHorizonChange={onHorizonChange}
        onRetry={onRetry}
        readModelState="failed"
        readModelStatus="failed"
        readModelError={{
          code: 'DATASET_FAILED',
          message: 'Dataset processing failed.',
          retryable: false,
          status: 409,
        }}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(screen.getByText('Dataset processing failed.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(onReadModelRetry).toHaveBeenCalledTimes(3);

    rerender(
      <ForecastsPanel
        data={null}
        loading={false}
        error={null}
        horizon={4}
        onHorizonChange={onHorizonChange}
        onRetry={onRetry}
        readModelState="failed"
        readModelStatus="failed"
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(
      screen.getByText(
        'Dataset processing failed. Upload a new dataset to continue.'
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(onReadModelRetry).toHaveBeenCalledTimes(4);

    rerender(
      <ForecastsPanel
        data={null}
        loading={false}
        error={null}
        horizon={4}
        onHorizonChange={onHorizonChange}
        onRetry={onRetry}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(
      screen.getByText('No forecast analytics available')
    ).toBeInTheDocument();

    rerender(
      <ForecastsPanel
        data={{
          datasetId: 'dataset-1',
          historical: [
            { period: 'Fall 2025', year: 2025, semester: 'Fall', total: 1000 },
          ],
          forecast: [
            {
              period: 'Spring 2026',
              year: 2026,
              semester: 'Spring',
              total: 1010,
              isForecasted: true,
            },
          ],
          fiveYearGrowthPct: 8,
          insights: {
            projectedGrowthText: 'Projected growth.',
            resourcePlanningText: 'Resource planning.',
            recommendationText: 'Recommendation.',
          },
        }}
        loading={false}
        error={null}
        horizon={4}
        onHorizonChange={onHorizonChange}
        onRetry={onRetry}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(screen.getByText('5-Year Growth: +8%')).toBeInTheDocument();
    expect(screen.getByText('Forecast section: 1/1')).toBeInTheDocument();

    rerender(
      <ForecastsPanel
        data={{
          datasetId: 'dataset-1',
          historical: [],
          forecast: [],
          fiveYearGrowthPct: -3,
          insights: {
            projectedGrowthText: 'Projected growth.',
            resourcePlanningText: 'Resource planning.',
            recommendationText: 'Recommendation.',
          },
        }}
        loading={false}
        error={null}
        horizon={4}
        onHorizonChange={onHorizonChange}
        onRetry={onRetry}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={onReadModelRetry}
      />
    );
    expect(screen.getByText('5-Year Growth: -3%')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Trigger Select Value' })
    );
    expect(onHorizonChange).toHaveBeenCalledWith(6);
  });

  test('ForecastsPanel READY state shows methodology summary from backend response', () => {
    render(
      <ForecastsPanel
        data={{
          datasetId: 'dataset-ready',
          state: 'READY',
          methodologySummary:
            'Holt linear trend with semester-level smoothing.',
          assumptions: [
            'Enrollment trends remain within recent seasonal ranges.',
          ],
          dataCoverage: {
            minAcademicPeriod: 'Fall 2023',
            maxAcademicPeriod: 'Spring 2026',
          },
          historical: [
            { period: 'Fall 2025', year: 2025, semester: 'Fall', total: 1000 },
          ],
          forecast: [
            {
              period: 'Spring 2026',
              year: 2026,
              semester: 'Spring',
              total: 1040,
              isForecasted: true,
            },
          ],
          fiveYearGrowthPct: 4,
          insights: {
            projectedGrowthText: 'Projected growth.',
            resourcePlanningText: 'Plan resources.',
            recommendationText: 'Recommendation.',
          },
        }}
        loading={false}
        error={null}
        horizon={4}
        onHorizonChange={jest.fn()}
        onRetry={jest.fn()}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={jest.fn()}
      />
    );

    expect(screen.getByText('Forecast methodology')).toBeInTheDocument();
    expect(
      screen.getByText('Holt linear trend with semester-level smoothing.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Data coverage: Fall 2023 to Spring 2026')
    ).toBeInTheDocument();
    expect(screen.getByText('Forecast section: 1/1')).toBeInTheDocument();
  });

  test('ForecastsPanel NEEDS_REBUILD state shows admin rebuild action and reason', () => {
    const onRebuildForecasts = jest.fn();

    render(
      <ForecastsPanel
        data={{
          datasetId: 'dataset-needs-rebuild',
          state: 'NEEDS_REBUILD',
          methodologySummary: 'Methodology summary from backend.',
          assumptions: ['Assumption A'],
          dataCoverage: null,
          fiveYearGrowthPct: null,
          historical: [],
          forecast: [],
          insights: null,
          reason: 'Forecast points are missing for the latest snapshot.',
          suggestedAction:
            'Rebuild forecast read models for the latest snapshot and refresh.',
          error: null,
        }}
        loading={false}
        error={null}
        canRebuildForecasts={true}
        rebuildLoading={false}
        rebuildError={null}
        rebuildJob={null}
        onRebuildForecasts={onRebuildForecasts}
        horizon={4}
        onHorizonChange={jest.fn()}
        onRetry={jest.fn()}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={jest.fn()}
      />
    );

    expect(screen.getByText('Forecast rebuild required')).toBeInTheDocument();
    expect(
      screen.getByText('Forecast points are missing for the latest snapshot.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Rebuild forecast read models for the latest snapshot and refresh.'
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Rebuild forecasts' }));
    expect(onRebuildForecasts).toHaveBeenCalledTimes(1);
  });

  test('ForecastsPanel NEEDS_REBUILD state shows contact-admin guidance for non-admin users', () => {
    render(
      <ForecastsPanel
        data={{
          datasetId: 'dataset-needs-rebuild',
          state: 'NEEDS_REBUILD',
          methodologySummary: 'Methodology summary from backend.',
          assumptions: [],
          dataCoverage: null,
          fiveYearGrowthPct: null,
          historical: [],
          forecast: [],
          insights: null,
          reason: 'Forecast data is stale.',
          suggestedAction: 'Rebuild forecasts.',
          error: null,
        }}
        loading={false}
        error={null}
        canRebuildForecasts={false}
        horizon={4}
        onHorizonChange={jest.fn()}
        onRetry={jest.fn()}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={jest.fn()}
      />
    );

    expect(
      screen.getByText(
        'Contact an admin to rebuild forecasts using the Admin Console.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Rebuild forecasts' })
    ).not.toBeInTheDocument();
  });

  test('ForecastsPanel FAILED state shows backend error code and recovery guidance', () => {
    render(
      <ForecastsPanel
        data={{
          datasetId: 'dataset-failed',
          state: 'FAILED',
          methodologySummary: 'Backend methodology text.',
          assumptions: [],
          dataCoverage: null,
          fiveYearGrowthPct: null,
          historical: [],
          forecast: [],
          insights: null,
          reason: null,
          suggestedAction: null,
          error: {
            code: 'FORECAST_BUILD_FAILED',
            message: 'Forecast rebuild job failed due to model overflow.',
            details: { datasetId: 'dataset-failed' },
          },
        }}
        loading={false}
        error={null}
        horizon={4}
        onHorizonChange={jest.fn()}
        onRetry={jest.fn()}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={jest.fn()}
      />
    );

    expect(screen.getByText('Forecast generation failed')).toBeInTheDocument();
    expect(
      screen.getByText(
        'FORECAST_BUILD_FAILED: Forecast rebuild job failed due to model overflow.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Contact an admin to review dataset/submission status and forecast rebuild job results in the Admin Console, then rebuild forecasts or upload a corrected dataset.'
      )
    ).toBeInTheDocument();
  });

  test('ForecastsPanel legacy NEEDS_REBUILD error path renders rebuild status details', () => {
    const onRebuildForecasts = jest.fn();

    render(
      <ForecastsPanel
        data={null}
        loading={false}
        error={{
          code: 'NEEDS_REBUILD',
          message: 'Forecasts need rebuild.',
          retryable: false,
        }}
        canRebuildForecasts={true}
        rebuildLoading={false}
        rebuildError={{
          code: 'SNAPSHOT_FORECAST_REBUILD_UNAVAILABLE',
          message: 'Snapshot cannot rebuild forecasts.',
          retryable: false,
        }}
        rebuildJob={{
          jobId: 'fjob-legacy',
          snapshotId: 'snap-1',
          datasetId: 'dataset-1',
          triggerSource: 'manual',
          status: 'queued',
          totalSteps: 3,
          completedSteps: 0,
          createdAt: '2026-02-25T00:00:00Z',
          startedAt: null,
          completedAt: null,
          error: null,
        }}
        onRebuildForecasts={onRebuildForecasts}
        horizon={4}
        onHorizonChange={jest.fn()}
        onRetry={jest.fn()}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={jest.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Rebuild forecasts' })
    ).toBeEnabled();
    expect(
      screen.getByText(
        'SNAPSHOT_FORECAST_REBUILD_UNAVAILABLE: Snapshot cannot rebuild forecasts.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Rebuild requested (job fjob-legacy, status: queued).')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Rebuild forecasts' }));
    expect(onRebuildForecasts).toHaveBeenCalledTimes(1);
  });

  test('ForecastsPanel legacy NEEDS_REBUILD error path shows loading rebuild action label', () => {
    render(
      <ForecastsPanel
        data={null}
        loading={false}
        error={{
          code: 'NEEDS_REBUILD',
          message: 'Forecasts need rebuild.',
          retryable: false,
        }}
        canRebuildForecasts={true}
        rebuildLoading={true}
        onRebuildForecasts={jest.fn()}
        horizon={4}
        onHorizonChange={jest.fn()}
        onRetry={jest.fn()}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={jest.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Starting rebuild…' })
    ).toBeDisabled();
  });

  test('ForecastsPanel NEEDS_REBUILD state falls back to default reason/action copy and loading CTA label', () => {
    render(
      <ForecastsPanel
        data={{
          datasetId: 'dataset-needs-rebuild',
          state: 'NEEDS_REBUILD',
          methodologySummary: 'Methodology summary.',
          assumptions: [],
          dataCoverage: {
            minAcademicPeriod: 'Fall 2025',
            maxAcademicPeriod: null,
          },
          fiveYearGrowthPct: null,
          historical: [],
          forecast: [],
          insights: null,
          reason: null,
          suggestedAction: null,
          error: null,
        }}
        loading={false}
        error={null}
        canRebuildForecasts={true}
        rebuildLoading={true}
        onRebuildForecasts={jest.fn()}
        horizon={4}
        onHorizonChange={jest.fn()}
        onRetry={jest.fn()}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={jest.fn()}
      />
    );

    expect(
      screen.getByText(
        'Forecasts are not currently available for this snapshot.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Rebuild forecast read models, then refresh the Forecasts tab.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Starting rebuild…' })
    ).toBeDisabled();
  });

  test('ForecastsPanel FAILED state falls back to default error code and message when error payload is missing', () => {
    render(
      <ForecastsPanel
        data={{
          datasetId: 'dataset-failed-no-error',
          state: 'FAILED',
          methodologySummary: 'Backend methodology text.',
          assumptions: [],
          dataCoverage: null,
          fiveYearGrowthPct: null,
          historical: [],
          forecast: [],
          insights: null,
          reason: null,
          suggestedAction: null,
          error: null,
        }}
        loading={false}
        error={null}
        horizon={4}
        onHorizonChange={jest.fn()}
        onRetry={jest.fn()}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={jest.fn()}
      />
    );

    expect(
      screen.getByText('FORECAST_FAILED: Forecast processing failed.')
    ).toBeInTheDocument();
  });

  test('ForecastsPanel READY state handles missing coverage bounds, null growth, and null insights', () => {
    const { rerender } = render(
      <ForecastsPanel
        data={{
          datasetId: 'dataset-ready-fallbacks',
          state: 'READY',
          methodologySummary: '   ',
          assumptions: [],
          dataCoverage: {
            minAcademicPeriod: null,
            maxAcademicPeriod: 'Spring 2026',
          },
          historical: [
            { period: 'Fall 2025', year: 2025, semester: 'Fall', total: 1000 },
          ],
          forecast: [
            {
              period: 'Spring 2026',
              year: 2026,
              semester: 'Spring',
              total: 1000,
              isForecasted: true,
            },
          ],
          fiveYearGrowthPct: 0,
          insights: {
            projectedGrowthText: '',
            resourcePlanningText: '',
            recommendationText: '',
          },
        }}
        loading={false}
        error={null}
        horizon={4}
        onHorizonChange={jest.fn()}
        onRetry={jest.fn()}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={jest.fn()}
      />
    );

    expect(
      screen.getByText('Methodology details were not provided by the backend.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Data coverage: Unknown to Spring 2026')
    ).toBeInTheDocument();

    rerender(
      <ForecastsPanel
        data={{
          datasetId: 'dataset-ready-fallbacks',
          state: 'READY',
          methodologySummary: 'Methodology summary',
          assumptions: [],
          dataCoverage: {
            minAcademicPeriod: 'Fall 2025',
            maxAcademicPeriod: null,
          },
          historical: [
            { period: 'Fall 2025', year: 2025, semester: 'Fall', total: 1000 },
          ],
          forecast: [
            {
              period: 'Spring 2026',
              year: 2026,
              semester: 'Spring',
              total: 1000,
              isForecasted: true,
            },
          ],
          fiveYearGrowthPct: null,
          insights: null,
        }}
        loading={false}
        error={null}
        horizon={4}
        onHorizonChange={jest.fn()}
        onRetry={jest.fn()}
        readModelState="ready"
        readModelStatus={null}
        readModelError={null}
        readModelPollingTimedOut={false}
        onReadModelRetry={jest.fn()}
      />
    );

    expect(
      screen.getByText('Data coverage: Fall 2025 to Unknown')
    ).toBeInTheDocument();
    expect(screen.getByText('5-Year Growth: Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Forecast section: 1/1')).toBeInTheDocument();
  });
});
