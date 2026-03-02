import { act, render, renderHook, screen } from '@testing-library/react';
import { CohortTabs } from '@/features/metrics/components/cohort-summary/cohort-tabs';
import { useCohortSummaryTable } from '@/features/metrics/components/cohort-summary/use-cohort-summary-table';

const cohortData = [
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

describe('cohort UI helpers', () => {
  test('CohortTabs returns null with no cohort options', () => {
    const { container } = render(
      <CohortTabs
        cohorts={[]}
        selectedCohort={undefined}
        onSelect={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('CohortTabs renders selected and unselected states', () => {
    const onSelect = jest.fn();
    render(
      <CohortTabs
        cohorts={[
          {
            cohortKey: 'FTIC_2024',
            cohortLabel: 'FTIC 2024',
            cohortYear: 2024,
            isCatchAll: false,
          },
          {
            cohortKey: 'FTIC_2023',
            cohortLabel: 'FTIC 2023',
            cohortYear: 2023,
            isCatchAll: false,
          },
        ]}
        selectedCohort="FTIC_2024"
        onSelect={onSelect}
      />
    );

    const selected = screen.getByRole('tab', { name: 'FTIC 2024' });
    const unselected = screen.getByRole('tab', { name: 'FTIC 2023' });

    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(unselected).toHaveAttribute('aria-selected', 'false');

    act(() => {
      unselected.click();
    });
    expect(onSelect).toHaveBeenCalledWith('FTIC_2023');
  });

  test('useCohortSummaryTable handles empty data and sort transitions', () => {
    const { result, rerender } = renderHook(
      ({ data }) => useCohortSummaryTable(data),
      { initialProps: { data: [] as typeof cohortData } }
    );

    expect(result.current.cohorts).toEqual([]);
    expect(result.current.selectedCohort).toBeUndefined();
    expect(result.current.filteredData).toEqual([]);
    expect(result.current.totalStudents).toBe(0);

    rerender({ data: cohortData });
    expect(result.current.selectedCohort).toBe('FTIC_2024');
    expect(result.current.filteredData[0].major).toBe('Biology');

    act(() => {
      result.current.setSelectedCohort('FTIC_2023');
    });
    expect(result.current.selectedCohort).toBe('FTIC_2023');
    expect(result.current.filteredData).toHaveLength(1);

    act(() => {
      result.current.setSelectedCohort('FTIC_1900');
    });
    expect(result.current.selectedCohort).toBe('FTIC_2024');

    act(() => {
      result.current.handleSort('major');
    });
    expect(result.current.filteredData[0].major).toBe('Biology');

    act(() => {
      result.current.handleSort('major');
    });
    expect(result.current.filteredData[0].major).toBe('Chemistry');
  });
});
