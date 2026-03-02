import type { CohortOption } from '../major-analytics/selectors';

interface CohortTabsProps {
  cohorts: CohortOption[];
  selectedCohort: string | undefined;
  onSelect: (cohortKey: string) => void;
}

export function CohortTabs({
  cohorts,
  selectedCohort,
  onSelect,
}: CohortTabsProps) {
  if (cohorts.length === 0) {
    return null;
  }

  return (
    <div
      className="mt-3 flex gap-1 rounded-lg bg-secondary p-1"
      role="tablist"
      aria-label="Select FTIC cohort"
    >
      {cohorts.map((cohort) => (
        <button
          key={cohort.cohortKey}
          role="tab"
          aria-selected={selectedCohort === cohort.cohortKey}
          onClick={() => onSelect(cohort.cohortKey)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            selectedCohort === cohort.cohortKey
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {cohort.cohortLabel}
        </button>
      ))}
    </div>
  );
}
