import { fireEvent, render, screen } from '@testing-library/react';
import { useTheme } from 'next-themes';
import { ThemeToggle } from '@/shared/components/ThemeToggle';

jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}));

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('ThemeToggle', () => {
  test.each([
    { theme: 'dark', expected: 'light' },
    { theme: 'light', expected: 'dark' },
    { theme: undefined, expected: 'dark' },
  ])(
    'switches from $theme to $expected',
    ({ theme, expected }: { theme?: string; expected: string }) => {
      const setTheme = jest.fn();
      mockUseTheme.mockReturnValue({
        theme,
        setTheme,
        resolvedTheme: theme,
      });

      render(<ThemeToggle />);
      fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }));

      expect(setTheme).toHaveBeenCalledWith(expected);
    }
  );
});
