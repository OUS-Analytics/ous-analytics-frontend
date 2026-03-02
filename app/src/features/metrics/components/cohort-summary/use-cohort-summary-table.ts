import { useMemo, useState } from 'react';
import type { MajorCohortRecord } from '@/features/metrics/types';
import {
  selectCohortKey,
  selectCohortOptions,
  type CohortOption,
} from '../major-analytics/selectors';

export type SortKey = 'major' | 'avgGPA' | 'avgCredits' | 'studentCount';

export function useCohortSummaryTable(data: MajorCohortRecord[]) {
  const cohorts = useMemo(() => selectCohortOptions(data), [data]);
  const [selectedCohortKey, setSelectedCohortKey] = useState<
    string | undefined
  >(undefined);
  const [sortKey, setSortKey] = useState<SortKey>('studentCount');
  const [sortAsc, setSortAsc] = useState(false);

  const latestKnownCohort = useMemo(() => {
    const knownCohorts = cohorts.filter(
      (cohort) => cohort.cohortYear !== null && !cohort.isCatchAll
    );

    return knownCohorts.at(-1) ?? cohorts[0];
  }, [cohorts]);

  const activeCohort = useMemo<CohortOption | undefined>(() => {
    if (selectedCohortKey) {
      const selected = cohorts.find(
        (cohort) => cohort.cohortKey === selectedCohortKey
      );
      if (selected) {
        return selected;
      }
    }

    return latestKnownCohort;
  }, [cohorts, latestKnownCohort, selectedCohortKey]);

  const filteredData = useMemo(() => {
    if (!activeCohort) {
      return [];
    }

    const cohortData = data.filter(
      (record) => selectCohortKey(record) === activeCohort.cohortKey
    );

    return [...cohortData].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortAsc
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortAsc
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [activeCohort, data, sortAsc, sortKey]);

  const totalStudents = filteredData.reduce(
    (sum, record) => sum + record.studentCount,
    0
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
      return;
    }

    setSortKey(key);
    setSortAsc(key === 'major');
  };

  return {
    cohorts,
    selectedCohort: activeCohort?.cohortKey,
    setSelectedCohort: setSelectedCohortKey,
    filteredData,
    totalStudents,
    handleSort,
  };
}
