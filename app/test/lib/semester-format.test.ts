import {
  FALL_SEMESTER_LABEL,
  SPRING_SEMESTER_LABEL,
  getSemesterLabelForDate,
  toSemesterLabel,
  toSemesterOrder,
} from '@/lib/format/semester';

describe('semester formatting helpers', () => {
  test('toSemesterOrder maps supported string and numeric semester values', () => {
    expect(toSemesterOrder(FALL_SEMESTER_LABEL)).toBe(1);
    expect(toSemesterOrder(SPRING_SEMESTER_LABEL)).toBe(2);
    expect(toSemesterOrder('1')).toBe(1);
    expect(toSemesterOrder('2')).toBe(2);
    expect(toSemesterOrder(1)).toBe(1);
    expect(toSemesterOrder(2)).toBe(2);
  });

  test('toSemesterOrder returns null for unsupported values', () => {
    expect(toSemesterOrder('Summer')).toBeNull();
    expect(toSemesterOrder('   ')).toBeNull();
    expect(toSemesterOrder(3)).toBeNull();
    expect(toSemesterOrder(Number.NaN)).toBeNull();
    expect(toSemesterOrder(undefined)).toBeNull();
  });

  test('toSemesterLabel maps semester order to canonical labels', () => {
    expect(toSemesterLabel(1)).toBe(FALL_SEMESTER_LABEL);
    expect(toSemesterLabel(2)).toBe(SPRING_SEMESTER_LABEL);
  });

  test('getSemesterLabelForDate uses month-based fall/spring partition', () => {
    expect(getSemesterLabelForDate(new Date('2026-10-01'))).toBe(
      FALL_SEMESTER_LABEL
    );
    expect(getSemesterLabelForDate(new Date('2026-03-01'))).toBe(
      SPRING_SEMESTER_LABEL
    );
  });
});
