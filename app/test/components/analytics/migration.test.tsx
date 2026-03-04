import { render, screen } from '@testing-library/react';
import { MigrationFlowChart } from '@/features/metrics/components/charts/MigrationFlowChart';
import { MigrationTopFlowsTable } from '@/features/metrics/components/MigrationTopFlowsTable';
import type { MigrationRecord } from '@/features/metrics/types';

const data: MigrationRecord[] = [
  {
    fromMajor: 'Biology',
    toMajor: 'Chemistry',
    semester: 'Fall 2023',
    count: 10,
  },
  {
    fromMajor: 'Math',
    toMajor: 'Biology',
    semester: 'Fall 2023',
    count: 7,
  },
  {
    fromMajor: 'Biology',
    toMajor: 'Chemistry',
    semester: 'Fall 2023',
    count: 5,
  },
  {
    fromMajor: 'Physics',
    toMajor: 'Math',
    semester: 'Spring 2023',
    count: 2,
  },
];

describe('migration components', () => {
  test('renders sankey insight and filters by semester', () => {
    render(<MigrationFlowChart data={data} selectedSemester="Fall 2023" />);

    expect(screen.getByText('Major Migration Flow')).toBeInTheDocument();
    expect(screen.getByText(/Fall 2023/)).toBeInTheDocument();
    expect(screen.getAllByText(/15/).length).toBeGreaterThan(0);
  });

  test('shows empty state when no migration data', () => {
    render(<MigrationFlowChart data={data} selectedSemester="Winter 2020" />);
    expect(
      screen.getByText('No migration data available for the selected semester.')
    ).toBeInTheDocument();
  });

  test('renders migration table with selected semester label', () => {
    render(<MigrationTopFlowsTable data={data} selectedSemester="Fall 2023" />);
    expect(
      screen.getByText(/Most common major changes \(Fall 2023\)/)
    ).toBeInTheDocument();
  });

  test('uses all semesters when no selection', () => {
    render(<MigrationFlowChart data={data} />);
    expect(screen.getByText(/All Semesters/)).toBeInTheDocument();

    render(<MigrationTopFlowsTable data={data} />);
    expect(
      screen.getByText(/Most common major changes \(All Semesters\)/)
    ).toBeInTheDocument();
  });

  test('handles zero-count migrations without NaN widths', () => {
    const zeroData: MigrationRecord[] = [
      {
        fromMajor: 'Biology',
        toMajor: 'Chemistry',
        semester: 'Fall 2024',
        count: 0,
      },
    ];

    render(<MigrationFlowChart data={zeroData} selectedSemester="Fall 2024" />);
    expect(screen.getAllByText(/0 students/).length).toBeGreaterThan(0);
  });
});
