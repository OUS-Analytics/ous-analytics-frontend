import type { MajorCohortRecord } from '@/features/metrics/types';

const UNKNOWN_COHORT_KEY = 'UNKNOWN';
const OTHER_COHORT_KEY = 'OTHER';
const UNLABELED_COHORT_LABEL = 'Unlabeled';
const UNKNOWN_COHORT_LABELS = new Set([
  'UNKNOWN',
  'N/A',
  'NA',
  'NONE',
  'NULL',
  'UNSPECIFIED',
]);

export interface CohortOption {
  cohortKey: string;
  cohortLabel: string;
  cohortYear: number | null;
  isCatchAll: boolean;
}

function parseCohortYear(value: string) {
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function isUnknownCohortLabel(label: string) {
  const normalized = label.trim().toUpperCase();
  return UNKNOWN_COHORT_LABELS.has(normalized);
}

function normalizeProvidedKey(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toUpperCase() : '';
}

function buildFallbackKeyFromLabel(label: string) {
  const normalized = label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized ? `COHORT_${normalized}` : UNKNOWN_COHORT_KEY;
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const normalizedWord = word.toLowerCase();
      return normalizedWord.charAt(0).toUpperCase() + normalizedWord.slice(1);
    })
    .join(' ');
}

function humanizeCohortKey(cohortKey: string) {
  const normalizedKey = cohortKey
    .replace(/^COHORT_/, '')
    .replace(/_/g, ' ')
    .trim();

  if (!normalizedKey) {
    return UNLABELED_COHORT_LABEL;
  }

  return toTitleCase(normalizedKey);
}

function deriveFallbackCohortKey(record: MajorCohortRecord) {
  const trimmedLabel = record.cohort.trim();
  const cohortYear = record.cohortYear ?? parseCohortYear(trimmedLabel);

  if (cohortYear !== null) {
    return `FTIC_${cohortYear}`;
  }

  if (trimmedLabel === '' || isUnknownCohortLabel(trimmedLabel)) {
    return UNKNOWN_COHORT_KEY;
  }

  if (trimmedLabel.toUpperCase() === OTHER_COHORT_KEY) {
    return OTHER_COHORT_KEY;
  }

  return buildFallbackKeyFromLabel(trimmedLabel);
}

function selectCohortLabel(record: MajorCohortRecord, cohort: CohortOption) {
  const trimmedLabel = record.cohort.trim();
  const normalizedLabel = trimmedLabel.toUpperCase();

  if (cohort.cohortKey === UNKNOWN_COHORT_KEY) {
    return 'Unknown';
  }

  if (cohort.cohortKey === OTHER_COHORT_KEY) {
    return 'Other';
  }

  if (cohort.cohortYear !== null) {
    return `FTIC ${cohort.cohortYear}`;
  }

  if (
    trimmedLabel !== '' &&
    !isUnknownCohortLabel(trimmedLabel) &&
    normalizedLabel !== OTHER_COHORT_KEY
  ) {
    return trimmedLabel;
  }

  return humanizeCohortKey(cohort.cohortKey);
}

function normalizeCohort(record: MajorCohortRecord): CohortOption {
  const providedKey = normalizeProvidedKey(record.cohortKey);
  const cohortKey = providedKey || deriveFallbackCohortKey(record);
  const keyYear = parseCohortYear(cohortKey);
  const labelYear = parseCohortYear(record.cohort.trim());
  const cohortYear = record.cohortYear ?? keyYear ?? labelYear;
  const normalizedKey = cohortKey.toUpperCase();
  const isCatchAll =
    normalizedKey === UNKNOWN_COHORT_KEY || normalizedKey === OTHER_COHORT_KEY;
  const cohortLabel = selectCohortLabel(record, {
    cohortKey: normalizedKey,
    cohortLabel: '',
    cohortYear,
    isCatchAll,
  });

  return {
    cohortKey: normalizedKey,
    cohortLabel,
    cohortYear,
    isCatchAll,
  };
}

function compareCohortOptions(left: CohortOption, right: CohortOption) {
  if (left.isCatchAll !== right.isCatchAll) {
    return left.isCatchAll ? 1 : -1;
  }

  const leftHasYear = left.cohortYear !== null;
  const rightHasYear = right.cohortYear !== null;

  if (leftHasYear && rightHasYear) {
    const yearDelta =
      (left.cohortYear as number) - (right.cohortYear as number);
    if (yearDelta !== 0) {
      return yearDelta;
    }
  }

  if (leftHasYear && !rightHasYear) {
    return -1;
  }

  if (!leftHasYear && rightHasYear) {
    return 1;
  }

  const labelDelta = left.cohortLabel.localeCompare(right.cohortLabel);
  if (labelDelta !== 0) {
    return labelDelta;
  }

  return left.cohortKey.localeCompare(right.cohortKey);
}

export function selectCohortOptions(data: MajorCohortRecord[]) {
  const byKey = new Map<string, CohortOption>();

  data.forEach((record) => {
    const cohort = normalizeCohort(record);
    const existing = byKey.get(cohort.cohortKey);

    if (!existing) {
      byKey.set(cohort.cohortKey, cohort);
      return;
    }

    if (existing.cohortYear === null && cohort.cohortYear !== null) {
      byKey.set(cohort.cohortKey, cohort);
      return;
    }
  });

  return Array.from(byKey.values()).sort(compareCohortOptions);
}

export function selectCohortKey(record: MajorCohortRecord) {
  const providedKey = normalizeProvidedKey(record.cohortKey);
  return providedKey || deriveFallbackCohortKey(record);
}

export function selectCohortLabels(data: MajorCohortRecord[]) {
  return selectCohortOptions(data).map((option) => option.cohortLabel);
}

export function selectWeightedGpaByMajor(data: MajorCohortRecord[]) {
  const majorMap: Record<string, { total: number; count: number }> = {};

  data.forEach((record) => {
    if (!majorMap[record.major])
      majorMap[record.major] = { total: 0, count: 0 };
    majorMap[record.major].total += (record.avgGPA ?? 0) * record.studentCount;
    majorMap[record.major].count += record.studentCount;
  });

  return Object.entries(majorMap)
    .map(([major, value]) => ({
      major,
      avgGPA: Math.round((value.total / value.count) * 100) / 100,
    }))
    .sort((a, b) => b.avgGPA - a.avgGPA);
}

export function selectWeightedCreditsByMajor(data: MajorCohortRecord[]) {
  const majorMap: Record<string, { total: number; count: number }> = {};

  data.forEach((record) => {
    if (!majorMap[record.major])
      majorMap[record.major] = { total: 0, count: 0 };
    majorMap[record.major].total +=
      (record.avgCredits ?? 0) * record.studentCount;
    majorMap[record.major].count += record.studentCount;
  });

  return Object.entries(majorMap)
    .map(([major, value]) => ({
      major,
      avgCredits: Math.round(value.total / value.count),
    }))
    .sort((a, b) => b.avgCredits - a.avgCredits);
}

export function selectCohortRowsByMajor(
  data: MajorCohortRecord[],
  metric: 'avgGPA' | 'avgCredits'
) {
  const cohorts = selectCohortOptions(data);
  const majors = Array.from(new Set(data.map((record) => record.major)));

  return majors.map((major) => {
    const row: Record<string, string | number> = { major };
    cohorts.forEach((cohort) => {
      const match = data.find(
        (record) =>
          record.major === major && selectCohortKey(record) === cohort.cohortKey
      );
      row[cohort.cohortKey] = match ? (match[metric] ?? 0) : 0;
    });
    return row;
  });
}
