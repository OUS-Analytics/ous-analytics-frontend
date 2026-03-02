import { render, screen, fireEvent, within } from '@testing-library/react';
import { CohortSummaryTable } from '@/features/metrics/components/CohortSummaryTable';

const data = [
  {
    major: 'Biology',
    cohort: 'FTIC 2024',
    cohortKey: 'FTIC_2024',
    cohortYear: 2024,
    avgGPA: 3.2,
    avgCredits: 15,
    studentCount: 200,
  },
  {
    major: 'Chemistry',
    cohort: 'FTIC 2024',
    cohortKey: 'FTIC_2024',
    cohortYear: 2024,
    avgGPA: 2.8,
    avgCredits: 18,
    studentCount: 120,
  },
  {
    major: 'Biology',
    cohort: 'FTIC 2023',
    cohortKey: 'FTIC_2023',
    cohortYear: 2023,
    avgGPA: 3.0,
    avgCredits: 14,
    studentCount: 150,
  },
];

describe('CohortSummaryTable', () => {
  test('filters by cohort and sorts by columns', () => {
    render(<CohortSummaryTable data={data} />);

    expect(screen.getByText('FTIC 2024')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();

    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows.length).toBeGreaterThan(2);

    const majorButton = screen.getByRole('button', { name: /major/i });
    fireEvent.click(majorButton);
    const afterAsc = within(table).getAllByRole('row')[1];
    expect(within(afterAsc).getByText('Biology')).toBeInTheDocument();

    fireEvent.click(majorButton);
    const afterDesc = within(table).getAllByRole('row')[1];
    expect(within(afterDesc).getByText('Chemistry')).toBeInTheDocument();

    const gpaButton = screen.getByRole('button', { name: /avg gpa/i });
    fireEvent.click(gpaButton);
    const gpaSorted = within(table).getAllByRole('row')[1];
    expect(within(gpaSorted).getByText('Biology')).toBeInTheDocument();

    fireEvent.click(gpaButton);
    const gpaSortedAsc = within(table).getAllByRole('row')[1];
    expect(within(gpaSortedAsc).getByText('Chemistry')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /avg credits/i }));
    fireEvent.click(screen.getByRole('button', { name: /students/i }));

    fireEvent.click(screen.getByRole('tab', { name: 'FTIC 2023' }));
    const updatedRows = within(table).getAllByRole('row');
    expect(within(updatedRows[1]).getByText('Biology')).toBeInTheDocument();
    expect(within(updatedRows[1]).getByText('150')).toBeInTheDocument();
  });

  test('renders fallback values when avg metrics are null', () => {
    render(
      <CohortSummaryTable
        data={[
          {
            major: 'Physics',
            cohort: 'FTIC 2025',
            cohortKey: 'FTIC_2025',
            cohortYear: 2025,
            avgGPA: null,
            avgCredits: null,
            studentCount: 10,
          },
        ]}
      />
    );

    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]).getByText('Physics')).toBeInTheDocument();
    expect(within(rows[1]).getByText('0.00')).toBeInTheDocument();
    expect(within(rows[1]).getAllByText('0').length).toBeGreaterThan(0);
    expect(within(rows[2]).getByText('10')).toBeInTheDocument();
  });
});
