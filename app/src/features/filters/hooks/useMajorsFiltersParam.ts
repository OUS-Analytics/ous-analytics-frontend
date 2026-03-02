'use client';

import { useCallback, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface MajorsFilterValues {
  academicPeriod?: string;
  school?: string;
  studentType?: string;
}

const MAJORS_FILTER_KEYS = ['academicPeriod', 'school', 'studentType'] as const;

function normalizeFilterValue(
  value: string | null | undefined
): string | undefined {
  if (value == null) {
    return undefined;
  }

  const trimmedValue = value.trim();
  if (trimmedValue === '' || trimmedValue.toLowerCase() === 'all') {
    return undefined;
  }

  return trimmedValue;
}

function normalizeFilters(filters: MajorsFilterValues): MajorsFilterValues {
  const normalized: MajorsFilterValues = {};

  for (const key of MAJORS_FILTER_KEYS) {
    const value = normalizeFilterValue(filters[key]);
    if (value !== undefined) {
      normalized[key] = value;
    }
  }

  return normalized;
}

function parseMajorsFiltersFromParams(
  searchParams: URLSearchParams
): MajorsFilterValues {
  const filters: MajorsFilterValues = {};

  for (const key of MAJORS_FILTER_KEYS) {
    const value = normalizeFilterValue(searchParams.get(key));
    if (value !== undefined) {
      filters[key] = value;
    }
  }

  return filters;
}

function filtersAreEqual(
  a: MajorsFilterValues,
  b: MajorsFilterValues
): boolean {
  return (
    a.academicPeriod === b.academicPeriod &&
    a.school === b.school &&
    a.studentType === b.studentType
  );
}

function buildQueryStringWithFilters(
  searchParams: URLSearchParams,
  filters: MajorsFilterValues
): string {
  const nextParams = new URLSearchParams(searchParams.toString());
  const normalizedFilters = normalizeFilters(filters);

  for (const key of MAJORS_FILTER_KEYS) {
    const value = normalizedFilters[key];
    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
  }

  return nextParams.toString();
}

export function useMajorsFiltersParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const stableRef = useRef<MajorsFilterValues>({});

  const filters = useMemo(() => {
    const parsed = parseMajorsFiltersFromParams(searchParams);
    if (filtersAreEqual(stableRef.current, parsed)) {
      return stableRef.current;
    }
    stableRef.current = parsed;
    return parsed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsString]);

  const setFilters = useCallback(
    (next: MajorsFilterValues) => {
      const nextQueryString = buildQueryStringWithFilters(searchParams, next);
      const nextHref = nextQueryString
        ? `${pathname}?${nextQueryString}`
        : pathname;
      const currentHref = searchParamsString
        ? `${pathname}?${searchParamsString}`
        : pathname;

      if (nextHref === currentHref) {
        return;
      }

      router.replace(nextHref);
    },
    [pathname, router, searchParams, searchParamsString]
  );

  return { filters, setFilters };
}
