import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MajorsFilterValues } from '@/features/filters/components/MajorsFilterPanel';

const SelectContext = React.createContext<((v: string) => void) | null>(null);

jest.mock('@/shared/ui/select', () => ({
  Select: ({
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <SelectContext.Provider value={onValueChange}>
      <div>{children}</div>
    </SelectContext.Provider>
  ),
  SelectTrigger: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    'aria-label'?: string;
  }) => <button {...props}>{children}</button>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => {
    const onValueChange = React.useContext(SelectContext);
    return (
      <div data-value={value} onClick={() => onValueChange?.(value)}>
        {children}
      </div>
    );
  },
}));

import { MajorsFilterPanel } from '@/features/filters/components/MajorsFilterPanel';

describe('MajorsFilterPanel', () => {
  const defaultProps = {
    filters: {} as MajorsFilterValues,
    onFiltersChange: jest.fn(),
    academicPeriodOptions: ['Fall 2025', 'Spring 2026'],
    schoolOptions: ['School of Engineering', 'School of Business'],
    studentTypeOptions: ['FTIC', 'Transfer', 'Continuing'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all three filter dropdowns', () => {
    render(<MajorsFilterPanel {...defaultProps} />);

    expect(screen.getByLabelText('Select semester')).toBeInTheDocument();
    expect(screen.getByLabelText('Select school')).toBeInTheDocument();
    expect(screen.getByLabelText('Select student type')).toBeInTheDocument();
  });

  test('renders filter panel with data-testid', () => {
    render(<MajorsFilterPanel {...defaultProps} />);
    expect(screen.getByTestId('majors-filter-panel')).toBeInTheDocument();
  });

  test('renders semester options', () => {
    render(<MajorsFilterPanel {...defaultProps} />);
    expect(screen.getByText('Fall 2025')).toBeInTheDocument();
    expect(screen.getByText('Spring 2026')).toBeInTheDocument();
  });

  test('renders school options', () => {
    render(<MajorsFilterPanel {...defaultProps} />);
    expect(screen.getByText('School of Engineering')).toBeInTheDocument();
    expect(screen.getByText('School of Business')).toBeInTheDocument();
  });

  test('renders student type options', () => {
    render(<MajorsFilterPanel {...defaultProps} />);
    expect(screen.getByText('FTIC')).toBeInTheDocument();
    expect(screen.getByText('Transfer')).toBeInTheDocument();
    expect(screen.getByText('Continuing')).toBeInTheDocument();
  });

  test('calls onFiltersChange with undefined for "all" on semester select', () => {
    const onFiltersChange = jest.fn();
    render(
      <MajorsFilterPanel {...defaultProps} onFiltersChange={onFiltersChange} />
    );

    fireEvent.click(screen.getByText('All Semesters'));

    expect(onFiltersChange).toHaveBeenCalledWith({
      academicPeriod: undefined,
    });
  });

  test('calls onFiltersChange with value for specific semester selection', () => {
    const onFiltersChange = jest.fn();
    render(
      <MajorsFilterPanel {...defaultProps} onFiltersChange={onFiltersChange} />
    );

    fireEvent.click(screen.getByText('Fall 2025'));

    expect(onFiltersChange).toHaveBeenCalledWith({
      academicPeriod: 'Fall 2025',
    });
  });

  test('calls onFiltersChange on school select and preserves existing filters', () => {
    const onFiltersChange = jest.fn();
    render(
      <MajorsFilterPanel
        {...defaultProps}
        filters={{ academicPeriod: 'Spring 2026' }}
        onFiltersChange={onFiltersChange}
      />
    );

    fireEvent.click(screen.getByText('School of Engineering'));

    expect(onFiltersChange).toHaveBeenCalledWith({
      academicPeriod: 'Spring 2026',
      school: 'School of Engineering',
    });
  });

  test('calls onFiltersChange on school "all" and preserves existing filters', () => {
    const onFiltersChange = jest.fn();
    render(
      <MajorsFilterPanel
        {...defaultProps}
        filters={{ academicPeriod: 'Spring 2026', school: 'School of Engineering' }}
        onFiltersChange={onFiltersChange}
      />
    );

    fireEvent.click(screen.getByText('All Schools'));

    expect(onFiltersChange).toHaveBeenCalledWith({
      academicPeriod: 'Spring 2026',
      school: undefined,
    });
  });

  test('calls onFiltersChange on student type select', () => {
    const onFiltersChange = jest.fn();
    render(
      <MajorsFilterPanel {...defaultProps} onFiltersChange={onFiltersChange} />
    );

    fireEvent.click(screen.getByText('Transfer'));

    expect(onFiltersChange).toHaveBeenCalledWith({
      studentType: 'Transfer',
    });
  });

  test('calls onFiltersChange on student type "all" select', () => {
    const onFiltersChange = jest.fn();
    render(
      <MajorsFilterPanel
        {...defaultProps}
        filters={{ studentType: 'FTIC' }}
        onFiltersChange={onFiltersChange}
      />
    );

    fireEvent.click(screen.getByText('All Student Types'));

    expect(onFiltersChange).toHaveBeenCalledWith({
      studentType: undefined,
    });
  });

  test('renders with empty option arrays', () => {
    render(
      <MajorsFilterPanel
        filters={{}}
        onFiltersChange={jest.fn()}
        academicPeriodOptions={[]}
        schoolOptions={[]}
        studentTypeOptions={[]}
      />
    );

    expect(screen.getByLabelText('Select semester')).toBeInTheDocument();
    expect(screen.getByLabelText('Select school')).toBeInTheDocument();
    expect(screen.getByLabelText('Select student type')).toBeInTheDocument();
  });
});
