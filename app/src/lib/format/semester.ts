export const FALL_SEMESTER_LABEL = 'Fall';
export const SPRING_SEMESTER_LABEL = 'Spring';

export type SemesterOrder = 1 | 2;

function asTrimmedString(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asKnownSemesterOrder(value: number): SemesterOrder | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  if (value === 1 || value === 2) {
    return value;
  }

  return null;
}

export function toSemesterOrder(
  semester: string | number | null | undefined
): SemesterOrder | null {
  if (typeof semester === 'number') {
    return asKnownSemesterOrder(semester);
  }

  const normalized = asTrimmedString(semester);
  if (!normalized) {
    return null;
  }

  if (normalized === FALL_SEMESTER_LABEL || normalized === '1') {
    return 1;
  }

  if (normalized === SPRING_SEMESTER_LABEL || normalized === '2') {
    return 2;
  }

  return null;
}

export function toSemesterLabel(order: SemesterOrder) {
  return order === 1 ? FALL_SEMESTER_LABEL : SPRING_SEMESTER_LABEL;
}

export function getSemesterLabelForDate(date: Date) {
  return date.getMonth() >= 7 ? FALL_SEMESTER_LABEL : SPRING_SEMESTER_LABEL;
}
