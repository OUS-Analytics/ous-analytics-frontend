import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/shared/ui/select', () => ({
  Select: ({ onValueChange, children }: any) => (
    <div
      data-testid="select"
      onClick={() => {
        onValueChange?.('all');
        onValueChange?.('Fall 2023');
      }}
    >
      {children}
    </div>
  ),
  SelectTrigger: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}));

import { SemesterRangeFilterSelect } from '@/features/filters/components/SemesterRangeFilterSelect';

describe('SemesterRangeFilterSelect', () => {
  test('maps all to undefined and forwards specific start/end semester values', () => {
    const onStartValueChange = jest.fn();
    const onEndValueChange = jest.fn();

    render(
      <SemesterRangeFilterSelect
        startValue={undefined}
        endValue={undefined}
        onStartValueChange={onStartValueChange}
        onEndValueChange={onEndValueChange}
        options={['Fall 2023']}
      />
    );

    const selects = screen.getAllByTestId('select');
    fireEvent.click(selects[0]!);
    fireEvent.click(selects[1]!);

    expect(onStartValueChange).toHaveBeenNthCalledWith(1, undefined);
    expect(onStartValueChange).toHaveBeenNthCalledWith(2, 'Fall 2023');
    expect(onEndValueChange).toHaveBeenNthCalledWith(1, undefined);
    expect(onEndValueChange).toHaveBeenNthCalledWith(2, 'Fall 2023');
  });
});
