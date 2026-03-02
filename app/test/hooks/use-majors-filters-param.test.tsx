import { act, renderHook } from '@testing-library/react';
import { useMajorsFiltersParam } from '@/features/filters/hooks/useMajorsFiltersParam';

const mockRouter = {
  replace: jest.fn(),
};

let mockPathname = '/dashboard';
let mockSearchParamsString = '';

function setMockSearchParams(search: string) {
  mockSearchParamsString = search.startsWith('?') ? search.slice(1) : search;
}

function applyMockHref(href: string) {
  const [pathname, query = ''] = href.split('?');
  mockPathname = pathname;
  setMockSearchParams(query);
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
}));

describe('useMajorsFiltersParam', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/dashboard';
    setMockSearchParams('');
    mockRouter.replace.mockImplementation((href: string) => {
      applyMockHref(href);
    });
  });

  test('normalizes query params on read (trim + blank/all handling)', () => {
    setMockSearchParams(
      'academicPeriod=%20Fall%202025%20&school=ALL&studentType=%20%20'
    );

    const { result } = renderHook(() => useMajorsFiltersParam());

    expect(result.current.filters).toEqual({
      academicPeriod: 'Fall 2025',
    });
  });

  test('writes normalized filters to URL while preserving unrelated params', () => {
    setMockSearchParams('date=2026-02-11&foo=bar');

    const { result } = renderHook(() => useMajorsFiltersParam());

    act(() => {
      result.current.setFilters({
        academicPeriod: ' Fall 2025 ',
        school: 'School of Science',
        studentType: 'FTIC',
      });
    });

    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    const href = mockRouter.replace.mock.calls[0][0] as string;
    const [, query = ''] = href.split('?');
    const params = new URLSearchParams(query);

    expect(params.get('date')).toBe('2026-02-11');
    expect(params.get('foo')).toBe('bar');
    expect(params.get('academicPeriod')).toBe('Fall 2025');
    expect(params.get('school')).toBe('School of Science');
    expect(params.get('studentType')).toBe('FTIC');
  });

  test('deletes filter params when values are undefined, blank, or all', () => {
    setMockSearchParams(
      'date=2026-02-11&academicPeriod=Fall%202025&school=School%20of%20Science&studentType=FTIC'
    );

    const { result } = renderHook(() => useMajorsFiltersParam());

    act(() => {
      result.current.setFilters({
        academicPeriod: 'All',
        school: '   ',
        studentType: undefined,
      });
    });

    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith(
      '/dashboard?date=2026-02-11'
    );
  });

  test('skips replace when normalized next query matches current query', () => {
    setMockSearchParams('date=2026-02-11&academicPeriod=Fall%202025');

    const { result } = renderHook(() => useMajorsFiltersParam());

    act(() => {
      result.current.setFilters({
        academicPeriod: '  Fall 2025  ',
        school: undefined,
        studentType: 'ALL',
      });
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  test('replaces with pathname-only href when filters are cleared and no params remain', () => {
    setMockSearchParams('academicPeriod=Fall%202025');

    const { result } = renderHook(() => useMajorsFiltersParam());

    act(() => {
      result.current.setFilters({});
    });

    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
  });

  test('treats empty current and next querystrings as a no-op', () => {
    setMockSearchParams('');

    const { result } = renderHook(() => useMajorsFiltersParam());

    act(() => {
      result.current.setFilters({});
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
